// skool-clone/apps/api/src/__tests__/admin.communities.test.ts
import request from 'supertest';
import express from 'express';
import communityRoutes from '../routes/admin/communities';
import { communityManagementController } from '../controllers/admin/communityManagementController';

jest.mock('../controllers/admin/communityManagementController');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin/communities', (req: any, res: any, next: any) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  });
  app.use('/admin/communities', communityRoutes);
  return app;
};

describe('Admin Communities Routes', () => {
  const app = createTestApp();
  const mockController = communityManagementController as jest.Mocked<typeof communityManagementController>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/communities', () => {
    it('should get communities list successfully', async () => {
      const mockCommunities = [{ id: 'comm-1', name: 'Test Community' }];
      mockController.getCommunities.mockResolvedValue({
        success: true,
        data: mockCommunities
      });

      const response = await request(app).get('/admin/communities').expect(200);
      expect(response.body.data).toEqual(mockCommunities);
    });
  });

  describe('GET /admin/communities/stats', () => {
    it('should get community stats', async () => {
      mockController.getCommunityStats.mockResolvedValue({
        success: true,
        data: { total: 10, public: 8, private: 2 }
      });

      const response = await request(app).get('/admin/communities/stats').expect(200);
      expect(response.body.data.total).toBe(10);
    });
  });

  describe('POST /admin/communities', () => {
    it('should create community successfully', async () => {
      const communityData = {
        name: 'New Community',
        slug: 'new-community',
        ownerId: 'user-123'
      };

      mockController.createCommunity.mockResolvedValue({
        success: true,
        data: { id: 'comm-new', ...communityData }
      });

      const response = await request(app)
        .post('/admin/communities')
        .send(communityData)
        .expect(201);

      expect(mockController.createCommunity).toHaveBeenCalledTimes(1);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/admin/communities')
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /admin/communities/:communityId', () => {
    it('should update community successfully', async () => {
      mockController.updateCommunity.mockResolvedValue({
        success: true,
        data: { id: 'comm-1', name: 'Updated Community' }
      });

      const response = await request(app)
        .put('/admin/communities/comm-1')
        .send({ name: 'Updated Community' })
        .expect(200);

      expect(mockController.updateCommunity).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation', () => {
    it('should validate UUID parameters', async () => {
      const response = await request(app)
        .get('/admin/communities/invalid-uuid')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });
});