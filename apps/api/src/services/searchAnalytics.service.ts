import { prisma } from '../lib/prisma';

export class SearchAnalyticsService {
  async logSearch(data: {
    userId?: string;
    query: string;
    filters?: any;
    page: number;
    resultsCount: number;
    took: number;
 }) {
    return prisma.searchQuery.create({ 
      data: {
        userId: data.userId,
        query: data.query,
        filters: data.filters ? data.filters : undefined,
        page: data.page,
        resultsCount: data.resultsCount,
        took: data.took
      }
    });
  }

  async logClick(searchId: string, resultId: string, resultType: string) {
    return prisma.searchQuery.update({
      where: { id: searchId },
      data: { 
        clickedResultId: resultId, 
        clickedResultType: resultType
      },
    });
  }

  // Get search analytics for a specific time period
  async getSearchAnalytics(startDate: Date, endDate: Date) {
    const searchQueries = await prisma.searchQuery.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate analytics
    const totalSearches = searchQueries.length;
    const totalResults = searchQueries.reduce((sum, query) => sum + (query.resultsCount || 0), 0);
    const avgResultsPerSearch = totalSearches > 0 ? totalResults / totalSearches : 0;
    const totalSearchTime = searchQueries.reduce((sum, query) => sum + (query.took || 0), 0);
    const avgSearchTime = totalSearches > 0 ? totalSearchTime / totalSearches : 0;
    
    // Get top queries
    const queryCounts: Record<string, number> = {};
    searchQueries.forEach(query => {
      queryCounts[query.query] = (queryCounts[query.query] || 0) + 1;
    });
    
    const topQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Get click-through rate
    const searchesWithClicks = searchQueries.filter(query => query.clickedResultId).length;
    const clickThroughRate = totalSearches > 0 ? (searchesWithClicks / totalSearches) * 100 : 0;

    return {
      totalSearches,
      avgResultsPerSearch: Math.round(avgResultsPerSearch * 100) / 100,
      avgSearchTime: Math.round(avgSearchTime * 100) / 100,
      topQueries,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100
    };
  }

  // Get popular search terms
  async getPopularSearchTerms(limit: number = 20) {
    const searchQueries = await prisma.searchQuery.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Limit to recent searches for relevance
    });

    const termCounts: Record<string, { count: number; results: number }> = {};
    
    searchQueries.forEach(query => {
      // Split query into individual terms
      const terms = query.query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      
      terms.forEach(term => {
        if (!termCounts[term]) {
          termCounts[term] = { count: 0, results: 0 };
        }
        termCounts[term].count += 1;
        termCounts[term].results += query.resultsCount || 0;
      });
    });

    // Sort by count and return top terms
    return Object.entries(termCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([term, data]) => ({
        term,
        count: data.count,
        avgResults: data.results > 0 ? Math.round(data.results / data.count) : 0
      }));
  }

  // Get no result searches
  async getNoResultSearches(limit: number = 50) {
    const searchQueries = await prisma.searchQuery.findMany({
      where: {
        resultsCount: 0
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return searchQueries.map(query => ({
      query: query.query,
      userId: query.userId,
      timestamp: query.createdAt,
      filters: query.filters
    }));
  }

  // Get search performance metrics
  async getSearchPerformance() {
    const oneHourAgo = new Date(Date.now() - 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const hourlyStats = await this.getSearchAnalytics(oneHourAgo, new Date());
    const dailyStats = await this.getSearchAnalytics(oneDayAgo, new Date());
    const weeklyStats = await this.getSearchAnalytics(oneWeekAgo, new Date());

    return {
      hourly: hourlyStats,
      daily: dailyStats,
      weekly: weeklyStats
    };
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();