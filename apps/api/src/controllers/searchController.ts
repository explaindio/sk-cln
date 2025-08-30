import { Request, Response } from 'express';
import { searchService } from '../services/searchService';
import { searchAnalyticsService } from '../services/searchAnalytics.service';

export class SearchController {
  async search(req: Request, res: Response) {
    try {
      const {
        query = '',
        type = 'all',
        page = 1,
        limit = 20,
        sortBy,
        sortOrder,
        filters = {}
      } = req.query;

      const startTime = Date.now();
      
      // Perform search
      const results = await searchService.search({
        query: query as string,
        type: type as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        filters: filters as Record<string, any>
      });

      const took = Date.now() - startTime;

      // Log search analytics
      await searchAnalyticsService.logSearch({
        userId: req.user?.id,
        query: query as string,
        filters: { type, ...filters },
        page: parseInt(page as string),
        resultsCount: results.total,
        took,
      });

      res.json({
        success: true,
        data: {
          ...results,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          took
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }
  }

  async suggest(req: Request, res: Response) {
    try {
      const { query = '', type = 'all' } = req.query;
      
      if (!query || (query as string).length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const indices = type === 'all' 
        ? ['communities', 'posts', 'courses', 'users'] 
        : [type as string];
      
      const field = type === 'users' ? 'username' : 'title';
      
      const suggestions = await searchService.suggest(
        indices,
        query as string,
        field
      );

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Suggest error:', error);
      res.status(500).json({
        success: false,
        error: 'Suggest failed'
      });
    }
  }

  async searchRelated(req: Request, res: Response) {
    try {
      const { type, id } = req.params;
      const { limit = 5 } = req.query;
      
      const results = await searchService.findSimilar({
        index: type,
        id,
        maxResults: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: results.hits
      });
    } catch (error) {
      console.error('Related search error:', error);
      res.status(500).json({
        success: false,
        error: 'Related search failed'
      });
    }
  }

  async syncSearchIndex(req: Request, res: Response) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { type } = req.body;
      
      // Start sync in background
      if (type === 'all') {
        searchService.syncAll().catch(console.error);
      } else {
        searchService.syncIndex(type).catch(console.error);
      }

      res.json({
        success: true,
        message: 'Sync started'
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Sync failed'
      });
    }
  }
}

export const searchController = new SearchController();