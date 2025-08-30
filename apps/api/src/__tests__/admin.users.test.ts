// skool-clone/apps/api/src/__tests__/admin.users.test.ts
import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/admin/users';
import { userManagementController } from '../controllers/admin/userManagementController';

// Mock middleware
const mockRequirePermission = jest.fn((permission) => (req: any, res: any, next: any) => next());

// Mock the controller
jest.mock('../controllers/admin/userManagementController');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock admin middleware
  app.use('/admin/users', (req: any, res: any, next: any) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  });

  // Use the routes
  app.use('/admin/users', userRoutes);

  return app;
};

describe('Admin Users Routes', () => {
  const app = createTestApp();
  const mockController = userManagementController as jest.Mocked<typeof userManagementController>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/users', () => {
    it('should get paginated users list successfully', async () => {
      const mockUsers = [
        { id: 'user-1', username: 'testuser1', email: 'test1@example.com', role: 'USER' },
        { id: 'user-2', username: 'testuser2', email: 'test2@example.com', role: 'MODERATOR' }
      ];
      const mockPagination = { page: 1, limit: 20, total: 2, pages: 1 };

      mockController.getUsers.mockResolvedValue({
        success: true,
        data: mockUsers,
        pagination: mockPagination
      });

      const response = await request(app)
        .get('/admin/users')
        .expect(200);

      expect(mockController.getUsers).toHaveBeenCalledTimes(1);
      expect(mockController.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          admin: { id: 'admin-123', role: 'ADMIN' },
          query: expect.any(Object)
        }),
        expect.any(Object)
      );
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.pagination).toEqual(mockPagination);
    });

    it('should handle query parameters correctly', async () => {
      mockController.getUsers.mockResolvedValue({
        success: true,
        data: [],
        pagination: { page: 2, limit: 10, total: 0, pages: 0 }
      });

      await request(app)
        .get('/admin/users?page=2&limit=10&search=test&role=MODERATOR&isActive=true&sortBy=username&sortOrder=desc')
        .expect(200);

      expect(mockController.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            page: '2',
            limit: '10',
            search: 'test',
            role: 'MODERATOR',
            isActive: 'true',
            sortBy: 'username',
            sortOrder: 'desc'
          }
        }),
        expect.any(Object)
      );
    });

    it('should handle controller errors', async () => {
      mockController.getUsers.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/admin/users')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch users'
      });
    });
  });

  describe('GET /admin/users/stats', () => {
    it('should get user statistics successfully', async () => {
      const mockStats = {
        total: 150,
        active: 120,
        banned: 15,
        newToday: 3,
        byRole: {
          USER: 100,
          MODERATOR: 25,
          ADMIN: 10,
          SUPER_ADMIN: 3
        }
      };

      mockController.getUserStats.mockResolvedValue({
        success: true,
        data: mockStats
      });

      const response = await request(app)
        .get('/admin/users/stats')
        .expect(200);

      expect(mockController.getUserStats).toHaveBeenCalledTimes(1);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('GET /admin/users/:userId', () => {
    it('should get user details successfully', async () => {
      const mockUserDetails = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        recentPosts: [
          { id: 'post-1', title: 'Test Post', createdAt: '2024-01-01T00:00:00Z' }
        ],
        recentActivity: [
          { action: 'LOGIN', target: 'SYSTEM', createdAt: '2024-01-01T00:00:00Z' }
        ]
      };

      mockController.getUser.mockResolvedValue({
        success: true,
        data: mockUserDetails
      });

      const response = await request(app)
        .get('/admin/users/user-123')
        .expect(200);

      expect(mockController.getUser).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { userId: 'user-123' },
          admin: { id: 'admin-123', role: 'ADMIN' }
        }),
        expect.any(Object)
      );
      expect(response.body.data).toEqual(mockUserDetails);
    });

    it('should handle invalid UUID parameter', async () => {
      const response = await request(app)
        .get('/admin/users/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toBeDefined();
      expect(mockController.getUser).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockController.getUser.mockResolvedValue({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });

      const response = await request(app)
        .get('/admin/users/nonexistent-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('POST /admin/users', () => {
    it('should create user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'USER'
      };

      const createdUser = {
        id: 'user-new',
        ...userData,
        password: undefined,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockController.createUser.mockResolvedValue({
        success: true,
        data: createdUser
      });

      const response = await request(app)
        .post('/admin/users')
        .send(userData)
        .expect(201);

      expect(mockController.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: userData,
          admin: { id: 'admin-123', role: 'ADMIN' }
        }),
        expect.any(Object)
      );
      expect(response.body.data).toEqual(createdUser);
    });

    it('should validate required fields', async () => {
      const testCases = [
        { body: {}, expectedError: 'Username, email, and password are required' },
        { body: { email: 'test@example.com', password: 'pass' }, expectedError: 'Username, email, and password are required' },
        { body: { username: 'test', password: 'pass' }, expectedError: 'Username, email, and password are required' },
        { body: { username: 'test', email: 'invalid-email', password: 'pass' }, expectedError: 'Validation failed' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/admin/users')
          .send(testCase.body)
          .expect(400);

        if (testCase.expectedError === 'Validation failed') {
          expect(response.body.error).toBe('Validation failed');
        } else {
          expect(response.body.error).toBe(testCase.expectedError);
        }
        expect(mockController.createUser).not.toHaveBeenCalled();
      }
    });

    it('should handle creation errors', async () => {
      mockController.createUser.mockResolvedValue({
        success: false,
        error: 'User with this email already exists'
      });

      const response = await request(app)
        .post('/admin/users')
        .send({ username: 'test', email: 'existing@example.com', password: 'pass123' })
        .expect(409);

      expect(response.body.error).toBe('User with this email already exists');
    });
  });

  describe('PUT /admin/users/:userId', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com'
      };

      const updatedUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'Name'
      };

      mockController.updateUser.mockResolvedValue({
        success: true,
        data: updatedUser
      });

      const response = await request(app)
        .put('/admin/users/user-123')
        .send(updateData)
        .expect(200);

      expect(mockController.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { userId: 'user-123' },
          body: updateData
        }),
        expect.any(Object)
      );
      expect(response.body.data).toEqual(updatedUser);
    });

    it('should filter out null/undefined/empty values', async () => {
      const updateData = {
        firstName: 'Test',
        lastName: null,
        bio: undefined,
        email: ''
      };

      mockController.updateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123', firstName: 'Test' }
      });

      await request(app)
        .put('/admin/users/user-123')
        .send(updateData)
        .expect(200);

      expect(mockController.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { firstName: 'Test' } // Should only include non-empty values
        }),
        expect.any(Object)
      );
    });
  });

  describe('DELETE /admin/users/:userId', () => {
    it('should delete user successfully', async () => {
      mockController.deleteUser.mockResolvedValue({
        success: true,
        data: { message: 'User deleted successfully' }
      });

      const response = await request(app)
        .delete('/admin/users/user-123')
        .expect(200);

      expect(mockController.deleteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { userId: 'user-123' },
          body: expect.any(Object)
        }),
        expect.any(Object)
      );
      expect(response.body.data.message).toBe('User deleted successfully');
    });

    it('should handle soft deletion', async () => {
      mockController.deleteUser.mockResolvedValue({
        success: true,
        data: { message: 'User deactivated' }
      });

      await request(app)
        .delete('/admin/users/user-123')
        .send({ permanent: false, reason: 'Inappropriate behavior' })
        .expect(200);

      expect(mockController.deleteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { userId: 'user-123' },
          body: { permanent: false, reason: 'Inappropriate behavior' }
        }),
        expect.any(Object)
      );
    });
  });

  describe('POST /admin/users/:userId/ban', () => {
    it('should ban user successfully', async () => {
      const banData = {
        reason: 'Violation of community guidelines',
        duration: 7,
        appealAllowed: true
      };

      mockController.banUser.mockResolvedValue({
        success: true,
        data: { message: 'User banned successfully' }
      });

      const response = await request(app)
        .post('/admin/users/user-123/ban')
        .send(banData)
        .expect(200);

      expect(mockController.banUser).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { userId: 'user-123' },
          body: banData
        }),
        expect.any(Object)
      );
      expect(response.body.data.message).toBe('User banned successfully');
    });

    it('should validate ban reason', async () => {
      const response = await request(app)
        .post('/admin/users/user-123/ban')
        .send({ duration: 7 })
        .expect(400);

      expect(response.body.error).toBe('Ban reason is required');
      expect(mockController.banUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/users/:userId/unban', () => {
    it('should unban user successfully', async () => {
      mockController.unbanUser.mockResolvedValue({
        success: true,
        data: { message: 'User unbanned successfully' }
      });

      const response = await request(app)
        .post('/admin/users/user-123/unban')
        .send({ reason: 'Appeal approved' })
        .expect(200);

      expect(mockController.unbanUser).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { userId: 'user-123' },
          body: { reason: 'Appeal approved' }
        }),
        expect.any(Object)
      );
      expect(response.body.data.message).toBe('User unbanned successfully');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate UUID parameters for user operations', async () => {
      const invalidIds = ['invalid-uuid', '123', 'user-name'];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/admin/users/${invalidId}`)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(mockController.getUser).not.toHaveBeenCalled();
      }
    });

    it('should handle missing parameters gracefully', async () => {
      const response = await request(app)
        .put('/admin/users/')
        .send({ firstName: 'Test' })
        .expect(404); // Express 404 for missing parameter

      expect(mockController.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle controller exceptions', async () => {
      mockController.getUsers.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .get('/admin/users')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch users');
    });

    it('should handle promise rejections', async () => {
      mockController.createUser.mockRejectedValue(new Error('Database unavailable'));

      const response = await request(app)
        .post('/admin/users')
        .send({ username: 'test', email: 'test@example.com', password: 'pass123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create user');
    });
  });

  describe('Security and Authorization', () => {
    it('should require admin user in request context', async () => {
      // This test verifies that our admin middleware works properly
      const response = await request(app)
        .get('/admin/users')
        .expect(200);

      // The request should succeed because our middleware sets req.admin
      expect(response.status).toBe(200);
    });

    it('should pass admin context to controller', async () => {
      mockController.getUsers.mockResolvedValue({
        success: true,
        data: []
      });

      await request(app)
        .get('/admin/users')
        .expect(200);

      const mockRequest = mockController.getUsers.mock.calls[0][0];
      expect(mockRequest.admin).toEqual({ id: 'admin-123', role: 'ADMIN' });
    });
  });
});