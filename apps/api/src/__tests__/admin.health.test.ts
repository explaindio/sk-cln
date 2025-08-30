// skool-clone/apps/api/src/__tests__/admin.health.test.ts
import request from 'supertest';
import express from 'express';
import healthRoutes from '../routes/admin/health';
import { systemHealthController } from '../controllers/admin/systemHealth.controller';

jest.mock('../controllers/admin/systemHealth.controller');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin/health', (req: any, res: any, next: any) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  });
  app.use('/admin/health', healthRoutes);
  return app;
};

describe('Admin Health Routes', () => {
  const app = createTestApp();
  const mockController = systemHealthController as jest.Mocked<typeof systemHealthController>;

  beforeEach(() => jest.clearAllMocks());

  describe('GET /admin/health/overview', () => {
    it('should get system health overview', async () => {
      const mockOverview = {
        overall: 'healthy',
        systemMetrics: { cpu: { usage: 45 }, memory: { usagePercentage: 60 } },
        databaseHealth: { status: 'healthy' },
        serviceHealth: { redis: { status: 'healthy' } },
        lastChecked: new Date()
      };

      mockController.getHealthOverview.mockResolvedValue({
        success: true,
        data: mockOverview
      });

      const response = await request(app).get('/admin/health/overview').expect(200);
      expect(response.body.data.overall).toBe('healthy');
    });
  });

  describe('POST /admin/health/check', () => {
    it('should run specific health check', async () => {
      mockController.runHealthCheck.mockResolvedValue({
        success: true,
        data: { checkType: 'database', result: { status: 'healthy' } }
      });

      const response = await request(app)
        .post('/admin/health/check')
        .send({ checkType: 'database' })
        .expect(200);

      expect(response.body.data.checkType).toBe('database');
    });
  });

  describe('System Metrics Endpoints', () => {
    it('should get CPU metrics', async () => {
      mockController.getCpuMetrics.mockResolvedValue({
        success: true,
        data: { currentLoad: 35, cores: 4 }
      });

      const response = await request(app).get('/admin/health/cpu').expect(200);
      expect(response.body.data.currentLoad).toBe(35);
    });

    it('should get memory metrics', async () => {
      mockController.getMemoryMetrics.mockResolvedValue({
        success: true,
        data: { usagePercentage: 60, free: '2GB' }
      });

      const response = await request(app).get('/admin/health/memory').expect(200);
      expect(response.body.data.usagePercentage).toBe(60);
    });
  });

  describe('Validation', () => {
    it('should validate health check parameters', async () => {
      const response = await request(app)
        .post('/admin/health/check')
        .send({ checkType: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });
});