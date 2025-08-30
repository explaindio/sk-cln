import request from 'supertest';
import express from 'express';
import searchRoutes from '../routes/search.routes';
import { authenticate } from '../middleware/auth';
import { searchService } from '../services/searchService';
import { searchAnalyticsService } from '../services/searchAnalytics.service';

// Mock middleware
jest.mock('../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'user-123', role: 'USER' };
    next();
  })
}));

// Mock services
jest.mock('../services/searchService');
jest.mock('../services/searchAnalytics.service');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api', searchRoutes);

describe('Search Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/search', () => {
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

      const response = await request(app)
        .get('/api/search')
        .query({ query: 'test', type: 'all', page: 1, limit: 20 })
        .expect(200);

      expect(searchService.search).toHaveBeenCalledWith({
        query: 'test',
        type: 'all',
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortOrder: undefined,
        filters: { type: 'all' },
        searchFields: undefined,
        searchOperator: undefined,
        phraseSearch: false,
        proximitySearch: undefined
      });

      expect(searchAnalyticsService.logSearch).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        data: {
          hits: expect.any(Array),
          total: 1,
          aggregations: {},
          page: 1,
          limit: 20,
          took: expect.any(Number)
        }
      });
    });

    it('should handle search errors', async () => {
      // Mock the search service to throw an error
      (searchService.search as jest.Mock).mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/search')
        .query({ query: 'test' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Search failed'
      });
    });

    it('should handle advanced search options', async () => {
      // Mock the search service
      (searchService.search as jest.Mock).mockResolvedValue({
        hits: [],
        total: 0,
        aggregations: {},
        took: 2
      });

      const response = await request(app)
        .get('/api/search')
        .query({
          query: 'test post',
          type: 'posts',
          phraseSearch: 'true',
          proximityTerms: ['test', 'post'],
          proximityDistance: 5
        })
        .expect(200);

      expect(searchService.search).toHaveBeenCalledWith({
        query: 'test post',
        type: 'posts',
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortOrder: undefined,
        filters: { type: 'posts' },
        searchFields: undefined,
        searchOperator: undefined,
        phraseSearch: true,
        proximitySearch: {
          distance: 5,
          terms: ['test', 'post']
        }
      });

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/search/suggest', () => {
    it('should return search suggestions', async () => {
      // Mock the search service
      (searchService.suggest as jest.Mock).mockResolvedValue([
        { text: 'test', count: 5 },
        { text: 'testing', count: 3 }
      ]);

      const response = await request(app)
        .get('/api/search/suggest')
        .query({ query: 'tes', type: 'all' })
        .expect(200);

      expect(searchService.suggest).toHaveBeenCalledWith(
        ['communities', 'posts', 'courses', 'users'],
        'tes',
        'title'
      );

      expect(response.body).toEqual({
        success: true,
        data: [
          { text: 'test', count: 5 },
          { text: 'testing', count: 3 }
        ]
      });
    });

    it('should return empty suggestions for short queries', async () => {
      const response = await request(app)
        .get('/api/search/suggest')
        .query({ query: 't' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: []
      });
    });

    it('should handle suggest errors', async () => {
      // Mock the search service to throw an error
      (searchService.suggest as jest.Mock).mockRejectedValue(new Error('Suggest failed'));

      const response = await request(app)
        .get('/api/search/suggest')
        .query({ query: 'test' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Suggest failed'
      });
    });
  });

  describe('GET /api/search/related/:type/:id', () => {
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

      const response = await request(app)
        .get('/api/search/related/posts/1')
        .query({ limit: 5 })
        .expect(200);

      expect(searchService.findSimilar).toHaveBeenCalledWith({
        index: 'posts',
        id: '1',
        maxResults: 5
      });

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should handle related search errors', async () => {
      // Mock the search service to throw an error
      (searchService.findSimilar as jest.Mock).mockRejectedValue(new Error('Related search failed'));

      const response = await request(app)
        .get('/api/search/related/posts/1')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Related search failed'
      });
    });
  });

  describe('POST /api/search/admin/sync', () => {
    it('should reject non-admin users', async () => {
      // Mock authenticate middleware to simulate non-admin user
      (authenticate as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'user-123', role: 'USER' };
        next();
      });

      const response = await request(app)
        .post('/api/search/admin/sync')
        .send({ type: 'all' })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required'
      });
    });

    it('should start sync for all indices', async () => {
      // Mock authenticate middleware to simulate admin user
      (authenticate as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-123', role: 'ADMIN' };
        next();
      });

      // Mock the search service sync methods
      (searchService.syncAll as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/search/admin/sync')
        .send({ type: 'all' })
        .expect(200);

      expect(searchService.syncAll).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        message: 'Sync started'
      });
    });

    it('should start sync for specific index', async () => {
      // Mock authenticate middleware to simulate admin user
      (authenticate as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-123', role: 'ADMIN' };
        next();
      });

      // Mock the search service sync methods
      (searchService.syncIndex as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/search/admin/sync')
        .send({ type: 'posts' })
        .expect(200);

      expect(searchService.syncIndex).toHaveBeenCalledWith('posts');
      expect(response.body).toEqual({
        success: true,
        message: 'Sync started'
      });
    });

    it('should handle sync errors', async () => {
      // Mock authenticate middleware to simulate admin user
      (authenticate as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-123', role: 'ADMIN' };
        next();
      });

      // Mock the search service to throw an error
      (searchService.syncAll as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      const response = await request(app)
        .post('/api/search/admin/sync')
        .send({ type: 'all' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Sync failed'
      });
    });
  });

  describe('POST /api/search/analytics/click', () => {
    it('should log a search click', async () => {
      // Mock the search analytics service
      (searchAnalyticsService.logClick as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/search/analytics/click')
        .send({
          searchId: 'search-123',
          resultId: 'result-456',
          resultType: 'post'
        })
        .expect(200);

      expect(searchAnalyticsService.logClick).toHaveBeenCalledWith(
        'search-123',
        'result-456',
        'post'
      );

      expect(response.body).toEqual({
        success: true,
        message: 'Click logged successfully'
      });
    });

    it('should handle click logging errors', async () => {
      // Mock the search analytics service to throw an error
      (searchAnalyticsService.logClick as jest.Mock).mockRejectedValue(new Error('Click failed'));

      const response = await request(app)
        .post('/api/search/analytics/click')
        .send({
          searchId: 'search-123',
          resultId: 'result-456',
          resultType: 'post'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to log click'
      });
    });
  });
});