import { SearchAnalyticsService } from '../services/searchAnalytics.service';
import { prisma } from '../lib/prisma';

// Mock Prisma client
jest.mock('../lib/prisma');

describe('SearchAnalyticsService', () => {
  let searchAnalyticsService: SearchAnalyticsService;

  beforeEach(() => {
    searchAnalyticsService = new SearchAnalyticsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logSearch', () => {
    it('should log a search query', async () => {
      // Mock the Prisma create method
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'search-123',
        userId: 'user-123',
        query: 'test',
        filters: null,
        page: 1,
        resultsCount: 5,
        took: 10,
        createdAt: new Date()
      });

      (prisma.searchQuery as any).create = mockCreate;

      const result = await searchAnalyticsService.logSearch({
        userId: 'user-123',
        query: 'test',
        filters: { type: 'all' },
        page: 1,
        resultsCount: 5,
        took: 10
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          query: 'test',
          filters: { type: 'all' },
          page: 1,
          resultsCount: 5,
          took: 10
        }
      });

      expect(result).toEqual({
        id: 'search-123',
        userId: 'user-123',
        query: 'test',
        filters: null,
        page: 1,
        resultsCount: 5,
        took: 10,
        createdAt: expect.any(Date)
      });
    });

    it('should handle undefined filters', async () => {
      // Mock the Prisma create method
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'search-123',
        userId: 'user-123',
        query: 'test',
        filters: null,
        page: 1,
        resultsCount: 0,
        took: 5,
        createdAt: new Date()
      });

      (prisma.searchQuery as any).create = mockCreate;

      const result = await searchAnalyticsService.logSearch({
        userId: 'user-123',
        query: 'test',
        page: 1,
        resultsCount: 0,
        took: 5
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          query: 'test',
          filters: undefined,
          page: 1,
          resultsCount: 0,
          took: 5
        }
      });

      expect(result).toEqual({
        id: 'search-123',
        userId: 'user-123',
        query: 'test',
        filters: null,
        page: 1,
        resultsCount: 0,
        took: 5,
        createdAt: expect.any(Date)
      });
    });
  });

  describe('logClick', () => {
    it('should log a search result click', async () => {
      // Mock the Prisma update method
      const mockUpdate = jest.fn().mockResolvedValue({
        id: 'search-123',
        userId: 'user-123',
        query: 'test',
        clickedResultId: 'result-456',
        clickedResultType: 'post',
        createdAt: new Date()
      });

      (prisma.searchQuery as any).update = mockUpdate;

      const result = await searchAnalyticsService.logClick('search-123', 'result-456', 'post');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'search-123' },
        data: {
          clickedResultId: 'result-456',
          clickedResultType: 'post'
        }
      });

      expect(result).toEqual({
        id: 'search-123',
        userId: 'user-123',
        query: 'test',
        clickedResultId: 'result-456',
        clickedResultType: 'post',
        createdAt: expect.any(Date)
      });
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics for a time period', async () => {
      // Mock the Prisma findMany method
      const mockFindMany = jest.fn().mockResolvedValue([
        {
          id: 'search-1',
          userId: 'user-1',
          query: 'test',
          resultsCount: 5,
          took: 10,
          clickedResultId: 'result-1',
          createdAt: new Date()
        },
        {
          id: 'search-2',
          userId: 'user-2',
          query: 'example',
          resultsCount: 3,
          took: 15,
          clickedResultId: null,
          createdAt: new Date()
        }
      ]);

      (prisma.searchQuery as any).findMany = mockFindMany;

      const startDate = new Date(Date.now() - 24 * 60 * 1000);
      const endDate = new Date();

      const result = await searchAnalyticsService.getSearchAnalytics(startDate, endDate);

      expect(mockFindMany).toHaveBeenCalledWith({
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

      expect(result).toEqual({
        totalSearches: 2,
        avgResultsPerSearch: 4,
        avgSearchTime: 12.5,
        topQueries: [
          { query: 'test', count: 1 },
          { query: 'example', count: 1 }
        ],
        clickThroughRate: 50
      });
    });

    it('should handle empty search results', async () => {
      // Mock the Prisma findMany method to return empty array
      const mockFindMany = jest.fn().mockResolvedValue([]);

      (prisma.searchQuery as any).findMany = mockFindMany;

      const startDate = new Date(Date.now() - 24 * 60 * 1000);
      const endDate = new Date();

      const result = await searchAnalyticsService.getSearchAnalytics(startDate, endDate);

      expect(mockFindMany).toHaveBeenCalledWith({
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

      expect(result).toEqual({
        totalSearches: 0,
        avgResultsPerSearch: 0,
        avgSearchTime: 0,
        topQueries: [],
        clickThroughRate: 0
      });
    });
  });

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms', async () => {
      // Mock the Prisma findMany method
      const mockFindMany = jest.fn().mockResolvedValue([
        { query: 'javascript tutorial', resultsCount: 10 },
        { query: 'react hooks', resultsCount: 8 },
        { query: 'nodejs api', resultsCount: 5 },
        { query: 'js', resultsCount: 3 }
      ]);

      (prisma.searchQuery as any).findMany = mockFindMany;

      const result = await searchAnalyticsService.getPopularSearchTerms(10);

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000
      });

      expect(result).toEqual([
        { term: 'javascript', count: 1, avgResults: 10 },
        { term: 'tutorial', count: 1, avgResults: 10 },
        { term: 'react', count: 1, avgResults: 8 },
        { term: 'hooks', count: 1, avgResults: 8 },
        { term: 'nodejs', count: 1, avgResults: 5 },
        { term: 'api', count: 1, avgResults: 5 },
        { term: 'js', count: 1, avgResults: 3 }
      ]);
    });

    it('should handle empty search queries', async () => {
      // Mock the Prisma findMany method to return empty array
      const mockFindMany = jest.fn().mockResolvedValue([]);

      (prisma.searchQuery as any).findMany = mockFindMany;

      const result = await searchAnalyticsService.getPopularSearchTerms(10);

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000
      });

      expect(result).toEqual([]);
    });
  });

  describe('getNoResultSearches', () => {
    it('should return searches with no results', async () => {
      // Mock the Prisma findMany method
      const mockFindMany = jest.fn().mockResolvedValue([
        {
          query: 'nonexistent topic',
          userId: 'user-1',
          createdAt: new Date(),
          filters: null
        },
        {
          query: 'xyz123',
          userId: 'user-2',
          createdAt: new Date(),
          filters: { type: 'posts' }
        }
      ]);

      (prisma.searchQuery as any).findMany = mockFindMany;

      const result = await searchAnalyticsService.getNoResultSearches(20);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          resultsCount: 0
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      expect(result).toEqual([
        {
          query: 'nonexistent topic',
          userId: 'user-1',
          timestamp: expect.any(Date),
          filters: null
        },
        {
          query: 'xyz123',
          userId: 'user-2',
          timestamp: expect.any(Date),
          filters: { type: 'posts' }
        }
      ]);
    });
  });

  describe('getSearchPerformance', () => {
    it('should return search performance metrics', async () => {
      // Mock the getSearchAnalytics method
      const mockGetSearchAnalytics = jest.spyOn(searchAnalyticsService, 'getSearchAnalytics')
        .mockResolvedValue({
          totalSearches: 100,
          avgResultsPerSearch: 5.2,
          avgSearchTime: 45.3,
          topQueries: [{ query: 'test', count: 10 }],
          clickThroughRate: 25.5
        });

      const result = await searchAnalyticsService.getSearchPerformance();

      expect(mockGetSearchAnalytics).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        hourly: {
          totalSearches: 100,
          avgResultsPerSearch: 5.2,
          avgSearchTime: 45.3,
          topQueries: [{ query: 'test', count: 10 }],
          clickThroughRate: 25.5
        },
        daily: {
          totalSearches: 100,
          avgResultsPerSearch: 5.2,
          avgSearchTime: 45.3,
          topQueries: [{ query: 'test', count: 10 }],
          clickThroughRate: 25.5
        },
        weekly: {
          totalSearches: 100,
          avgResultsPerSearch: 5.2,
          avgSearchTime: 45.3,
          topQueries: [{ query: 'test', count: 10 }],
          clickThroughRate: 25.5
        }
      });
    });
  });
});