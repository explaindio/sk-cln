// skool-clone/apps/api/src/__tests__/admin.feature-flags.test.ts
import request from 'supertest';
import express from 'express';
import featureFlagRoutes from '../routes/admin/feature-flags';
import { featureFlagsController } from '../controllers/admin/featureFlags.controller';

jest.mock('../controllers/admin/featureFlags.controller');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin/feature-flags', (req: any, res: any, next: any) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  });
  app.use('/admin/feature-flags', featureFlagRoutes);
  return app;
};

describe('Admin Feature Flags Routes', () => {
  const app = createTestApp();
  const mockController = featureFlagsController as jest.Mocked<typeof featureFlagsController>;

  beforeEach(() => jest.clearAllMocks());

  describe('CRUD Operations', () => {
    describe('GET /admin/feature-flags', () => {
      it('should get feature flags list', async () => {
        mockController.getFeatureFlags.mockResolvedValue({
          success: true,
          data: [{ id: 'ff-1', name: 'Test Flag', key: 'test_flag' }]
        });

        const response = await request(app).get('/admin/feature-flags').expect(200);
        expect(response.body.data).toHaveLength(1);
      });
    });

    describe('POST /admin/feature-flags', () => {
      it('should create feature flag successfully', async () => {
        const flagData = {
          name: 'New Feature',
          key: 'new_feature',
          value: true,
          defaultValue: false
        };

        mockController.createFeatureFlag.mockResolvedValue({
          success: true,
          data: { id: 'ff-new', ...flagData }
        });

        const response = await request(app)
          .post('/admin/feature-flags')
          .send(flagData)
          .expect(201);

        expect(mockController.createFeatureFlag).toHaveBeenCalledTimes(1);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/admin/feature-flags')
          .send({ name: 'Test' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('PUT /admin/feature-flags/:flagId', () => {
      it('should update feature flag', async () => {
        mockController.updateFeatureFlag.mockResolvedValue({
          success: true,
          data: { id: 'ff-1', name: 'Updated Flag' }
        });

        const response = await request(app)
          .put('/admin/feature-flags/ff-1')
          .send({ name: 'Updated Flag' })
          .expect(200);

        expect(mockController.updateFeatureFlag).toHaveBeenCalledTimes(1);
      });
    });

    describe('PATCH /admin/feature-flags/:flagId/toggle', () => {
      it('should toggle feature flag', async () => {
        mockController.toggleFeatureFlag.mockResolvedValue({
          success: true,
          data: { id: 'ff-1', isActive: false }
        });

        const response = await request(app)
          .patch('/admin/feature-flags/ff-1/toggle')
          .send({ isActive: false })
          .expect(200);

        expect(response.body.data.isActive).toBe(false);
      });
    });
  });

  describe('Experiments', () => {
    describe('GET /admin/feature-flags/experiments', () => {
      it('should get experiments list', async () => {
        mockController.getExperiments.mockResolvedValue({
          success: true,
          data: [{ id: 'exp-1', name: 'Test Experiment' }]
        });

        const response = await request(app)
          .get('/admin/feature-flags/experiments')
          .expect(200);

        expect(response.body.data).toHaveLength(1);
      });
    });

    describe('POST /admin/feature-flags/experiments', () => {
      it('should create experiment', async () => {
        const experimentData = {
          name: 'New Experiment',
          featureFlagId: 'ff-1',
          variants: [{ name: 'variant-a', value: true, percentage: 50 }]
        };

        mockController.createExperiment.mockResolvedValue({
          success: true,
          data: { id: 'exp-new', ...experimentData }
        });

        const response = await request(app)
          .post('/admin/feature-flags/experiments')
          .send(experimentData)
          .expect(201);

        expect(mockController.createExperiment).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Segments', () => {
    describe('POST /admin/feature-flags/:flagId/segments', () => {
      it('should add segment to feature flag', async () => {
        const segmentData = {
          name: 'Premium Users',
          type: 'custom',
          conditions: { plan: 'premium' }
        };

        mockController.addSegment.mockResolvedValue({
          success: true,
          data: { id: 'seg-new', ...segmentData }
        });

        const response = await request(app)
          .post('/admin/feature-flags/ff-1/segments')
          .send(segmentData)
          .expect(201);

        expect(mockController.addSegment).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /admin/feature-flags/:key/analytics', () => {
      it('should get feature flag analytics', async () => {
        mockController.getFeatureFlagAnalytics.mockResolvedValue({
          success: true,
          data: { totalUsages: 1000, conversionRate: 0.85 }
        });

        const response = await request(app)
          .get('/admin/feature-flags/test_flag/analytics')
          .expect(200);

        expect(response.body.data.totalUsages).toBe(1000);
      });
    });
  });

  describe('Public Evaluation', () => {
    describe('GET /admin/feature-flags/evaluate/:key', () => {
      it('should evaluate feature flag', async () => {
        mockController.evaluateFeatureFlag.mockResolvedValue({
          success: true,
          data: { enabled: true, value: 'variant-a' }
        });

        const response = await request(app)
          .get('/admin/feature-flags/test_flag/evaluate')
          .query({ userId: 'user-1' })
          .expect(200);

        expect(response.body.data.enabled).toBe(true);
      });
    });
  });

  describe('Validation', () => {
    it('should validate UUID parameters', async () => {
      const response = await request(app)
        .get('/admin/feature-flags/invalid-uuid')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate feature flag keys', async () => {
      const response = await request(app)
        .get('/admin/feature-flags/key/invalid key')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });
});