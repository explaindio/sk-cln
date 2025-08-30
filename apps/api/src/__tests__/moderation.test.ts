import request from 'supertest';
import express from 'express';
import { moderationController } from '../controllers/moderationController';
import moderationRoutes from '../routes/moderation';

// Mock the controller to test route integration
jest.mock('../controllers/moderationController', () => ({
  moderationController: {
    checkContent: jest.fn(),
    autoModerationCheck: jest.fn(),
    getDashboard: jest.fn(),
    getStats: jest.fn(),
    moderateContent: jest.fn(),
    bulkModerate: jest.fn(),
    getContentFilters: jest.fn(),
    createContentFilter: jest.fn(),
    updateContentFilter: jest.fn(),
    deleteContentFilter: jest.fn(),
    // Add the report management methods
    createReport: jest.fn(),
    getReports: jest.fn(),
    reviewReport: jest.fn(),
    getReportStats: jest.fn(),
  },
}));

// Mock middleware
jest.mock('../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'user-id-123', email: 'test@example.com', role: 'USER' };
    next();
  }),
}));

jest.mock('../middleware/admin', () => ({
  requireAdmin: jest.fn((req: any, res: any, next: any) => {
    req.admin = {
      id: 'admin-id-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['content.moderate', 'reports.view', 'settings.edit']
    };
    req.user = { id: 'admin-id-123', email: 'admin@example.com', role: 'ADMIN' };
    next();
  }),
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => {
    next();
  }),
}));

jest.mock('../middleware/validation', () => ({
  handleValidationErrors: jest.fn((req, res, next) => next()),
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/moderation', moderationRoutes);
  return app;
};

describe('Moderation Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Public Endpoints', () => {
    describe('POST /moderation/check-content', () => {
      it('should validate content and return moderation result', async () => {
        const mockResult = {
          allowed: true,
          violations: [],
          actions: [],
          reasons: []
        };

        (moderationController.checkContent as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockResult });
        });

        const response = await request(app)
          .post('/moderation/check-content')
          .send({
            content: 'This is a test post content',
            contentType: 'post'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.checkContent).toHaveBeenCalledTimes(1);
      });

      it('should handle validation errors', async () => {
        const response = await request(app)
          .post('/moderation/check-content')
          .send({
            content: '', // Invalid: empty content
            contentType: 'invalid' // Invalid: wrong content type
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /moderation/auto-check', () => {
      it('should process content through auto-moderation', async () => {
        const mockResult = {
          allowed: true,
          violations: [],
          actions: [],
          reasons: []
        };

        (moderationController.autoModerationCheck as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockResult });
        });

        const response = await request(app)
          .post('/moderation/auto-check')
          .send({
            content: 'This is a test message',
            contentType: 'message',
            metadata: { source: 'chat' }
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.autoModerationCheck).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Admin Only Endpoints', () => {
    describe('GET /moderation/dashboard', () => {
      it('should return moderation dashboard data', async () => {
        const mockDashboard = {
          pendingReports: [],
          recentActivity: [],
          activeFilters: 3,
          activeRules: 5,
          bannedUsers: 2,
          stats: {}
        };

        (moderationController.getDashboard as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockDashboard });
        });

        const response = await request(app)
          .get('/moderation/dashboard')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.getDashboard).toHaveBeenCalledTimes(1);
      });
    });

    describe('GET /moderation/stats', () => {
      it('should return moderation statistics', async () => {
        const mockStats = {
          timeframe: 'week',
          totalLogs: 50,
          totalReports: 10,
          totalBans: 2,
          actionsBreakdown: { DELETE: 5, HIDE: 3 }
        };

        (moderationController.getStats as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockStats });
        });

        const response = await request(app)
          .get('/moderation/stats')
          .query({ timeframe: 'week' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.getStats).toHaveBeenCalledTimes(1);
      });

      it('should validate timeframe parameter', async () => {
        const response = await request(app)
          .get('/moderation/stats')
          .query({ timeframe: 'invalid' })
          .expect(400);
      });
    });

    describe('POST /moderation/moderate', () => {
      it('should moderate content successfully', async () => {
        const mockResult = {
          success: true,
          result: { action: 'HIDDEN' },
          logged: true
        };

        (moderationController.moderateContent as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockResult });
        });

        const response = await request(app)
          .post('/moderation/moderate')
          .send({
            targetId: 'post-id-123',
            targetType: 'post',
            action: 'HIDE',
            reason: 'Inappropriate content',
            notes: 'Test moderation'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.moderateContent).toHaveBeenCalledTimes(1);
      });

      it('should validate required parameters', async () => {
        const response = await request(app)
          .post('/moderation/moderate')
          .send({
            targetId: '', // Invalid: empty
            action: 'INVALID_ACTION' // Invalid: wrong action
          })
          .expect(400);
      });
    });

    describe('POST /moderation/bulk', () => {
      it('should bulk moderate content successfully', async () => {
        const mockResult = {
          success: true,
          processed: 3,
          successful: 3,
          failed: 0,
          results: [],
          errors: []
        };

        (moderationController.bulkModerate as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockResult });
        });

        const response = await request(app)
          .post('/moderation/bulk')
          .send({
            targetIds: ['post-1', 'post-2', 'post-3'],
            targetType: 'post',
            action: 'DELETE',
            reason: 'Bulk moderation',
            notes: 'Weekly cleanup'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.bulkModerate).toHaveBeenCalledTimes(1);
      });

      it('should reject too many items', async () => {
        const manyIds = Array.from({ length: 60 }, (_, i) => `post-${i + 1}`);

        const response = await request(app)
          .post('/moderation/bulk')
          .send({
            targetIds: manyIds,
            targetType: 'post',
            action: 'HIDE'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Content Filter Management', () => {
    describe('GET /moderation/filters', () => {
      it('should return content filters', async () => {
        const mockFilters = [
          {
            id: 'filter-1',
            name: 'Spam filter',
            type: 'keyword',
            pattern: 'spam',
            severity: 'MEDIUM',
            action: 'FLAG',
            isActive: true
          }
        ];

        (moderationController.getContentFilters as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockFilters });
        });

        const response = await request(app)
          .get('/moderation/filters')
          .query({ activeOnly: 'true' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.getContentFilters).toHaveBeenCalledTimes(1);
      });
    });

    describe('POST /moderation/filters', () => {
      it('should create content filter', async () => {
        const mockFilter = {
          id: 'new-filter-123',
          name: 'Test filter',
          type: 'regex',
          pattern: 'test.*pattern',
          severity: 'HIGH',
          action: 'DELETE',
          isActive: true
        };

        (moderationController.createContentFilter as jest.Mock).mockImplementation((req, res) => {
          res.status(201).json({ success: true, data: mockFilter });
        });

        const response = await request(app)
          .post('/moderation/filters')
          .send({
            name: 'Test filter',
            type: 'regex',
            pattern: 'test.*pattern',
            severity: 'HIGH',
            action: 'DELETE'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(moderationController.createContentFilter).toHaveBeenCalledTimes(1);
      });
    });

    describe('PUT /moderation/filters/:id', () => {
      it('should update content filter', async () => {
        const updatedFilter = {
          id: 'filter-123',
          name: 'Updated filter',
          isActive: false
        };

        (moderationController.updateContentFilter as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: updatedFilter });
        });

        const response = await request(app)
          .put('/moderation/filters/filter-123')
          .send({
            name: 'Updated filter',
            isActive: false
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.updateContentFilter).toHaveBeenCalledTimes(1);
      });
    });

    describe('DELETE /moderation/filters/:id', () => {
      it('should delete content filter', async () => {
        (moderationController.deleteContentFilter as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, message: 'Content filter deleted successfully' });
        });

        const response = await request(app)
          .delete('/moderation/filters/filter-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.deleteContentFilter).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Report Management', () => {
    describe('POST /moderation/reports', () => {
      it('should create a report', async () => {
        const mockReport = {
          id: 'report-123',
          reporterId: 'user-id-123',
          targetType: 'post',
          targetId: 'post-123',
          reason: 'SPAM',
          status: 'PENDING'
        };

        (moderationController.createReport as jest.Mock).mockImplementation((req, res) => {
          res.status(201).json({ success: true, data: mockReport });
        });

        const response = await request(app)
          .post('/moderation/reports')
          .send({
            targetType: 'post',
            targetId: 'post-123',
            reason: 'HARASSMENT',
            description: 'User is being abusive'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(moderationController.createReport).toHaveBeenCalledTimes(1);
      });

      it('should handle duplicate reports', async () => {
        (moderationController.createReport as jest.Mock).mockImplementation((req, res) => {
          res.status(409).json({ success: false, error: 'You have already reported this content' });
        });

        const response = await request(app)
          .post('/moderation/reports')
          .send({
            targetType: 'post',
            targetId: 'post-123',
            reason: 'SPAM'
          })
          .expect(409);
      });
    });

    describe('GET /moderation/reports', () => {
      it('should return reports', async () => {
        const mockReports = [
          {
            id: 'report-1',
            targetType: 'post',
            reason: 'SPAM',
            status: 'PENDING',
            reporter: { username: 'user1' },
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        (moderationController.getReports as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockReports });
        });

        const response = await request(app)
          .get('/moderation/reports')
          .query({ status: 'pending', limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.getReports).toHaveBeenCalledTimes(1);
      });
    });

    describe('POST /moderation/reports/:id/review', () => {
      it('should review and resolve report', async () => {
        const mockReviewResult = {
          success: true,
          report: { id: 'report-123', status: 'RESOLVED' },
          action: { action: 'DELETE', target: 'post-123' }
        };

        (moderationController.reviewReport as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockReviewResult });
        });

        const response = await request(app)
          .post('/moderation/reports/report-123/review')
          .send({
            decision: 'approve',
            resolution: 'Content violates community standards'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.reviewReport).toHaveBeenCalledTimes(1);
      });
    });

    describe('GET /moderation/report-stats', () => {
      it('should return report statistics', async () => {
        const mockStats = {
          overview: {
            total: 50,
            pending: 10,
            resolved: 35,
            dismissed: 5
          },
          byType: { post: 30, comment: 20 },
          byReason: { SPAM: 25, HARASSMENT: 15 }
        };

        (moderationController.getReportStats as jest.Mock).mockImplementation((req, res) => {
          res.json({ success: true, data: mockStats });
        });

        const response = await request(app)
          .get('/moderation/report-stats')
          .query({ timeframe: 'month' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(moderationController.getReportStats).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Health Check', () => {
    describe('GET /moderation/health', () => {
      it('should return health check', async () => {
        const response = await request(app)
          .get('/moderation/health')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.service).toBe('moderation');
        expect(response.body.status).toBe('healthy');
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle controller errors gracefully', async () => {
      (moderationController.getDashboard as jest.Mock).mockImplementation((req, res) => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/moderation/dashboard')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use('/moderation', moderationRoutes);

      const response = await request(unauthenticatedApp)
        .post('/moderation/auto-check')
        .send({
          content: 'test',
          contentType: 'post'
        })
        .expect(401); // Auth middleware should handle this
    });
  });
});