import { Request, Response } from 'express';
import { userManagementController } from '../../controllers/admin/userManagementController';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    communityMember: {
      count: jest.fn(),
    },
    community: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    moderationLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UserManagementController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonSpy,
      status: statusSpy,
      send: jest.fn(),
    };

    mockRequest = {
      query: {},
      params: {},
      body: {},
    };

    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return paginated users successfully', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'user1',
          email: 'user1@test.com',
          role: UserRole.USER,
          isActive: true,
          _count: {
            posts: 5,
            comments: 10,
            communities: 2,
          },
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      mockRequest.query = {
        page: '1',
        limit: '10',
        search: 'user',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.getUsers(adminRequest, mockResponse as Response);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { contains: 'user', mode: 'insensitive' } },
            { email: { contains: 'user', mode: 'insensitive' } },
            { firstName: { contains: 'user', mode: 'insensitive' } },
            { lastName: { contains: 'user', mode: 'insensitive' } },
          ],
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should handle errors and return 500', async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.getUsers(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Failed to fetch users',
      });
    });
  });

  describe('getUser', () => {
    it('should return user details successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'user1',
        email: 'user1@test.com',
        role: UserRole.USER,
        isActive: true,
        bannedUser: {
          banReason: 'Violation',
          bannedUntil: null,
          bannedBy: 'admin-id',
          appealStatus: 'pending',
          appealNotes: 'Appealing ban',
        },
        _count: {
          posts: 5,
          comments: 10,
          communities: 2,
          moderationLogs: 1,
        },
      };

      const mockPosts = [{ id: '1', title: 'Post', createdAt: new Date() }];
      const mockActivity = [{ action: 'LOGIN', target: 'SESSION', createdAt: new Date() }];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockActivity);

      mockRequest.params = { userId: '1' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.getUser(adminRequest, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockUser,
          recentPosts: mockPosts,
          recentActivity: mockActivity,
        }),
      });
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { userId: 'non-existent' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.getUser(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'newuser',
        email: 'newuser@test.com',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.createUser(adminRequest, mockResponse as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'newuser',
          email: 'newuser@test.com',
          passwordHash: 'hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.USER,
          isActive: true,
          isEmailVerified: true,
        }),
        select: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockUser });
    });

    it('should return 409 if user already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      mockRequest.body = {
        username: 'existinguser',
        email: 'existing@test.com',
        password: 'password123',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.createUser(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'User with this username or email already exists',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        username: 'newuser',
        // missing email and password
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.createUser(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Username, email, and password are required',
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUpdatedUser = {
        id: '1',
        username: 'user1',
        email: 'newemail@test.com',
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'New bio',
        role: UserRole.MODERATOR,
        isActive: true,
        updatedAt: new Date(),
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      mockRequest.params = { userId: '1' };
      mockRequest.body = {
        email: 'newemail@test.com',
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'New bio',
        role: UserRole.MODERATOR,
        password: 'newpassword123',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.updateUser(adminRequest, mockResponse as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          email: 'newemail@test.com',
          firstName: 'Updated',
          lastName: 'Name',
          bio: 'New bio',
          role: UserRole.MODERATOR,
          passwordHash: 'new-hashed-password',
        }),
        select: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockUpdatedUser });
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      });

      mockRequest.params = { userId: 'non-existent' };
      mockRequest.body = { firstName: 'New Name' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.updateUser(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { userId: '1' };
      mockRequest.body = { reason: 'Violation' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { role: UserRole.SUPER_ADMIN, id: 'admin-id' };

      await userManagementController.deleteUser(adminRequest, mockResponse as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date), isActive: false },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'User deactivated' },
      });
    });

    it('should permanently delete user as super admin', async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { userId: '1' };
      mockRequest.body = { reason: 'Severe violation', permanent: true };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { role: UserRole.SUPER_ADMIN, id: 'admin-id' };

      await userManagementController.deleteUser(adminRequest, mockResponse as Response);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'User permanently deleted' },
      });
    });

    it('should return 403 for non-super admin permanent delete', async () => {
      mockRequest.params = { userId: '1' };
      mockRequest.body = { permanent: true };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { role: UserRole.ADMIN, id: 'admin-id' };

      await userManagementController.deleteUser(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Only super admins can delete users',
      });
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1', isActive: false });
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { userId: '1' };
      mockRequest.body = { reason: 'Violation', duration: '7 days', appealAllowed: true };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.banUser(adminRequest, mockResponse as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });

      expect(prisma.moderationLog.create).toHaveBeenCalledWith({
        data: {
          action: 'BAN',
          targetType: 'user',
          targetId: '1',
          moderatorId: 'admin-id',
          reason: 'Violation',
          metadata: { duration: '7 days', appealAllowed: true },
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'User banned successfully' },
      });
    });

    it('should return 400 if reason is missing', async () => {
      mockRequest.params = { userId: '1' };
      mockRequest.body = {};

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.banUser(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Ban reason is required',
      });
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1', isActive: true });
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { userId: '1' };
      mockRequest.body = { reason: 'Appeal approved' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.unbanUser(adminRequest, mockResponse as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: true },
      });

      expect(prisma.moderationLog.create).toHaveBeenCalledWith({
        data: {
          action: 'UNBAN',
          targetType: 'user',
          targetId: '1',
          moderatorId: 'admin-id',
          reason: 'Appeal approved',
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'User unbanned successfully' },
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics successfully', async () => {
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(80)   // active
        .mockResolvedValueOnce(20)   // banned
        .mockResolvedValueOnce(5);   // newToday

      (prisma.user.groupBy as jest.Mock).mockResolvedValue([
        { role: UserRole.USER, _count: { role: 60 } },
        { role: UserRole.MODERATOR, _count: { role: 15 } },
        { role: UserRole.ADMIN, _count: { role: 5 } },
      ]);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await userManagementController.getUserStats(adminRequest, mockResponse as Response);

      expect(prisma.user.count).toHaveBeenCalledTimes(4);
      expect(prisma.user.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        _count: { role: true },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          total: 100,
          active: 80,
          banned: 20,
          newToday: 5,
          byRole: {
            [UserRole.USER]: 60,
            [UserRole.MODERATOR]: 15,
            [UserRole.ADMIN]: 5,
          },
        },
      });
    });
  });
});