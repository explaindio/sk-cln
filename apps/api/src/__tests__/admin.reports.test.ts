// skool-clone/apps/api/src/__tests__/admin.reports.test.ts
import request from 'supertest';
import express from 'express';
import reportRoutes from '../routes/admin/reports';
import { reportManagementController } from '../controllers/admin/reportManagementController';

jest.mock('../controllers/admin/reportManagementController');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin/reports', (req: any, res: any, next: any) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  });
  app.use('/admin/reports', reportRoutes);
  return app;
};

describe('Admin Reports Routes', () => {
  const app = createTestApp();
  const mockController = reportManagementController as jest.Mocked<typeof reportManagementController>;

  beforeEach(() => jest.clearAllMocks());

  describe('GET /admin/reports', () => {
    it('should get reports list', async () => {
      mockController.getReports.mockResolvedValue({
        success: true,
        data: [{ id: 'rpt-1', reason: 'Spam' }]
      });

      const response = await request(app).get('/admin/reports').expect(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /admin/reports/:reportId/review', () => {
    it('should review report successfully', async () => {
      mockController.reviewReport.mockResolvedValue({
        success: true,
        data: { message: 'Report approved' }
      });

      const response = await request(app)
        .post('/admin/reports/rpt-1/review')
        .send({ decision: 'approve', resolution: 'Valid report' })
        .expect(200);

      expect(response.body.data.message).toBe('Report approved');
    });
  });

  describe('POST /admin/reports/quick-action', () => {
    it('should apply quick action', async () => {
      mockController.quickAction.mockResolvedValue({
        success: true,
        data: { message: 'Quick action applied' }
      });

      const response = await request(app)
        .post('/admin/reports/quick-action')
        .send({ targetType: 'post', targetId: 'post-1', action: 'delete_content' })
        .expect(200);

      expect(response.body.data.message).toBe('Quick action applied');
    });
  });

  describe('Validation', () => {
    it('should validate parameters', async () => {
      const response = await request(app)
        .post('/admin/reports/invalid-uuid/review')
        .send({ decision: 'approve' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });
});