import { Request, Response } from 'express';
import { SearchController } from '../controllers/searchController';
import { searchService } from '../services/searchService';
import { searchAnalyticsService } from '../services/searchAnalytics.service';

// Mock the services
jest.mock('../services/searchService');
jest.mock('../services/searchAnalytics.service');

describe('SearchController', () => {
  let searchController: SearchController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonResponse: jest.Mock;

  beforeEach(() => {
    searchController = new SearchController();
    jsonResponse = jest.fn();
    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user-123', role: 'USER' }
    };
    mockResponse = {
      json: jsonResponse,
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should perform a search and return results', async () => {
      // Mock the search service
      (searchService.search as jest.Mock).mockResolvedValue({
        hits: [
          {
            _id: '1',
            _index: 'posts',
            _score: 1.0,
            _source: {
              id: '1',
              title: 'Test Post',
              content: 'This is a test post'
            }
          }
        ],
        total: 1,
        aggregations: {},
        took: 5
      });

      // Mock the search analytics service
      (searchAnalyticsService.logSearch as jest.Mock).mockResolvedValue(undefined);

      mockRequest.query = {
        query: 'test',
        type: 'all',
        page: '1',
        limit: '20'
      };

      await searchController.search(mockRequest as Request, mockResponse as Response);

      expect(searchService.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'all',
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortOrder: undefined,
        filters: {}
      });

      expect(searchAnalyticsService.logSearch).toHaveBeenCalled();
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          hits: expect.any(Array),
          total: 1,
          aggregations: {},
          took: expect.any(Number),
          page: 1,
          limit: 20
        }
      });
    });

    it('should handle search errors', async () => {
      // Mock the search service to throw an error
      (searchService.search as jest.Mock).mockRejectedValue(new Error('Search failed'));

      mockRequest.query = {
        query: 'test'
      };

      await searchController.search(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Search failed'
      });
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      // Mock the search service
      (searchService.suggest as jest.Mock).mockResolvedValue([
        { text: 'test', count: 5 },
        { text: 'testing', count: 3 }
      ]);

      mockRequest.query = {
        query: 'tes',
        type: 'all'
      };

      await searchController.suggest(mockRequest as Request, mockResponse as Response);

      expect(searchService.suggest).toHaveBeenCalledWith(
        ['communities', 'posts', 'courses', 'users'],
        'tes',
        'title'
      );

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: [
          { text: 'test', count: 5 },
          { text: 'testing', count: 3 }
        ]
      });
    });

    it('should return empty suggestions for short queries', async () => {
      mockRequest.query = {
        query: 't'
      };

      await searchController.suggest(mockRequest as Request, mockResponse as Response);

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    it('should handle suggest errors', async () => {
      // Mock the search service to throw an error
      (searchService.suggest as jest.Mock).mockRejectedValue(new Error('Suggest failed'));

      mockRequest.query = {
        query: 'test'
      };

      await searchController.suggest(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Suggest failed'
      });
    });
  });

  describe('searchRelated', () => {
    it('should return related search results', async () => {
      // Mock the search service
      (searchService.findSimilar as jest.Mock).mockResolvedValue({
        hits: [
          {
            _id: '2',
            _score: 0.8,
            _source: {
              id: '2',
              title: 'Similar Post',
              content: 'This is a similar post'
            }
          }
        ],
        total: 1,
        took: 3
      });

      mockRequest.params = {
        type: 'posts',
        id: '1'
      };
      mockRequest.query = {
        limit: '5'
      };

      await searchController.searchRelated(mockRequest as Request, mockResponse as Response);

      expect(searchService.findSimilar).toHaveBeenCalledWith({
        index: 'posts',
        id: '1',
        maxResults: 5
      });

      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should handle related search errors', async () => {
      // Mock the search service to throw an error
      (searchService.findSimilar as jest.Mock).mockRejectedValue(new Error('Related search failed'));

      mockRequest.params = {
        type: 'posts',
        id: '1'
      };

      await searchController.searchRelated(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Related search failed'
      });
    });
  });

  describe('syncSearchIndex', () => {
    it('should reject non-admin users', async () => {
      mockRequest.user = { id: 'user-123', role: 'USER' };

      await searchController.syncSearchIndex(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required'
      });
    });

    it('should start sync for all indices', async () => {
      mockRequest.user = { id: 'admin-123', role: 'ADMIN' };
      mockRequest.body = {
        type: 'all'
      };

      // Mock the search service sync methods
      (searchService.syncAll as jest.Mock).mockResolvedValue(undefined);

      await searchController.syncSearchIndex(mockRequest as Request, mockResponse as Response);

      expect(searchService.syncAll).toHaveBeenCalled();
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Sync started'
      });
    });

    it('should start sync for specific index', async () => {
      mockRequest.user = { id: 'admin-123', role: 'ADMIN' };
      mockRequest.body = {
        type: 'posts'
      };

      // Mock the search service sync methods
      (searchService.syncIndex as jest.Mock).mockResolvedValue(undefined);

      await searchController.syncSearchIndex(mockRequest as Request, mockResponse as Response);

      expect(searchService.syncIndex).toHaveBeenCalledWith('posts');
      expect(jsonResponse).toHaveBeenCalledWith({
        success: true,
        message: 'Sync started'
      });
    });

    it('should handle sync errors', async () => {
      mockRequest.user = { id: 'admin-123', role: 'ADMIN' };
      mockRequest.body = {
        type: 'all'
      };

      // Mock the search service to throw an error
      (searchService.syncAll as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      await searchController.syncSearchIndex(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Sync failed'
      });
    });
  });
});