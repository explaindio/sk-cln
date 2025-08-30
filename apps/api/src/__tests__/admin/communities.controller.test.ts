import { Request, Response } from 'express';
import { communityManagementController } from '../../controllers/admin/communityManagementController';
import { prisma } from '../../lib/prisma';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    community: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    communityMember: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    leaderboard: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('CommunityManagementController', () => {
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

  describe('getCommunities', () => {
    it('should return paginated communities successfully', async () => {
      const mockCommunities = [
        {
          id: '1',
          name: 'Test Community',
          slug: 'test-community',
          description: 'A test community',
          isPublic: true,
          isPaid: false,
          owner: {
            id: 'owner1',
            username: 'owneruser',
            email: 'owner@test.com',
          },
          _count: {
            members: 10,
            posts: 5,
            courses: 2,
          },
        },
      ];

      (prisma.community.findMany as jest.Mock).mockResolvedValue(mockCommunities);
      (prisma.community.count as jest.Mock).mockResolvedValue(1);

      mockRequest.query = {
        page: '1',
        limit: '10',
        search: 'test',
        isPublic: 'true',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.getCommunities(adminRequest, mockResponse as Response);

      expect(prisma.community.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
          isPublic: true,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: mockCommunities,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should handle errors and return 500', async () => {
      (prisma.community.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.getCommunities(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Failed to fetch communities',
      });
    });
  });

  describe('getCommunity', () => {
    it('should return detailed community information successfully', async () => {
      const mockCommunity = {
        id: '1',
        name: 'Test Community',
        slug: 'test-community',
        description: 'A detailed test community',
        isPublic: true,
        isPaid: false,
        owner: {
          id: 'owner1',
          username: 'owneruser',
          email: 'owner@test.com',
        },
        members: [
          {
            joinedAt: new Date(),
            user: {
              id: 'user1',
              username: 'member1',
              email: 'member1@test.com',
              role: 'member',
            },
          },
        ],
        categories: [{ id: 'cat1', name: 'General', description: 'General discussion' }],
        _count: {
          members: 15,
          posts: 25,
          courses: 5,
          leaderboard: 3,
        },
      };

      const mockRecentPosts = [
        {
          id: 'post1',
          title: 'Recent Post',
          createdAt: new Date(),
          author: { username: 'author1' },
        },
      ];

      (prisma.community.findUnique as jest.Mock).mockResolvedValue(mockCommunity);
      (prisma.post.findMany as jest.Mock).mockResolvedValue(mockRecentPosts);
      (prisma.communityMember.count as jest.Mock)
        .mockResolvedValueOnce(8)  // dailyActiveUsers
        .mockResolvedValueOnce(12) // weeklyActiveUsers
        .mockResolvedValueOnce(15); // monthlyActiveUsers

      mockRequest.params = { communityId: '1' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.getCommunity(adminRequest, mockResponse as Response);

      expect(prisma.community.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockCommunity,
          recentPosts: mockRecentPosts,
          stats: {
            dailyActiveUsers: 8,
            weeklyActiveUsers: 12,
            monthlyActiveUsers: 15,
          },
        }),
      });
    });

    it('should return 404 if community not found', async () => {
      (prisma.community.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { communityId: 'non-existent' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.getCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Community not found',
      });
    });
  });

  describe('createCommunity', () => {
    it('should create a new community successfully', async () => {
      const mockCommunity = {
        id: '1',
        name: 'New Community',
        slug: 'new-community',
        description: 'A new test community',
        isPublic: true,
        isPaid: false,
        memberCount: 1,
        owner: {
          id: 'owner1',
          username: 'owneruser',
          email: 'owner@test.com',
        },
      };

      (prisma.community.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(mockCommunity); // get owner

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'owner1', isActive: true });
      (prisma.community.create as jest.Mock).mockResolvedValue(mockCommunity);
      (prisma.communityMember.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = {
        name: 'New Community',
        slug: 'new-community',
        description: 'A new test community',
        ownerId: 'owner1',
        isPublic: true,
        isPaid: false,
        priceMonthly: 9.99,
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.createCommunity(adminRequest, mockResponse as Response);

      expect(prisma.community.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Community',
          slug: 'new-community',
          description: 'A new test community',
          ownerId: 'owner1',
          isPublic: true,
          isPaid: false,
          priceMonthly: 9.99,
          memberCount: 1,
        }),
        include: expect.any(Object),
      });

      expect(prisma.communityMember.create).toHaveBeenCalledWith({
        data: {
          communityId: '1',
          userId: 'owner1',
          role: 'admin',
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockCommunity });
    });

    it('should return 409 if slug already exists', async () => {
      (prisma.community.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      mockRequest.body = {
        name: 'New Community',
        slug: 'existing-slug',
        ownerId: 'owner1',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.createCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Community with this slug already exists',
      });
    });

    it('should return 404 if owner not found', async () => {
      (prisma.community.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.body = {
        name: 'New Community',
        slug: 'new-community',
        ownerId: 'non-existent',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.createCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Specified owner does not exist',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        name: 'New Community',
        // missing slug and ownerId
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.createCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Name, slug, and owner ID are required',
      });
    });
  });

  describe('updateCommunity', () => {
    it('should update community successfully', async () => {
      const mockUpdatedCommunity = {
        id: '1',
        name: 'Updated Community',
        slug: 'new-slug',
        description: 'Updated description',
        isPublic: false,
        isPaid: true,
        priceMonthly: 19.99,
        priceYearly: 199.99,
        owner: {
          id: 'owner1',
          username: 'owneruser',
          email: 'owner@test.com',
        },
      };

      (prisma.community.findFirst as jest.Mock).mockResolvedValue(null); // slug uniqueness check
      (prisma.community.update as jest.Mock).mockResolvedValue(mockUpdatedCommunity);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { communityId: '1' };
      mockRequest.body = {
        name: 'Updated Community',
        slug: 'new-slug',
        description: 'Updated description',
        isPublic: false,
        isPaid: true,
        priceMonthly: 19.99,
        priceYearly: 199.99,
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.updateCommunity(adminRequest, mockResponse as Response);

      expect(prisma.community.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          name: 'Updated Community',
          slug: 'new-slug',
          description: 'Updated description',
          isPublic: false,
          isPaid: true,
          priceMonthly: 19.99,
          priceYearly: 199.99,
        }),
        include: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockUpdatedCommunity });
    });

    it('should return 409 if new slug already exists', async () => {
      (prisma.community.findFirst as jest.Mock).mockResolvedValue({ id: 'existing', slug: 'existing-slug' });

      mockRequest.params = { communityId: '1' };
      mockRequest.body = { slug: 'existing-slug' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.updateCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Community with this slug already exists',
      });
    });

    it('should return 404 if community not found', async () => {
      (prisma.community.update as jest.Mock).mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      });

      mockRequest.params = { communityId: 'non-existent' };
      mockRequest.body = { name: 'New Name' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.updateCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Community not found',
      });
    });
  });

  describe('deleteCommunity', () => {
    it('should soft delete community successfully', async () => {
      const mockCommunity = {
        name: 'Test Community',
        slug: 'test-community',
      };

      (prisma.community.findUnique as jest.Mock).mockResolvedValue(mockCommunity);
      (prisma.community.update as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { communityId: '1' };
      mockRequest.body = { reason: 'Community violation' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { role: 'SUPER_ADMIN', id: 'admin-id' };

      await communityManagementController.deleteCommunity(adminRequest, mockResponse as Response);

      expect(prisma.community.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          name: expect.stringContaining('[DELETED]'),
          slug: expect.stringContaining('deleted-'),
          isPublic: false,
          description: 'This community has been deleted.',
        }),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'Community deactivated' },
      });
    });

    it('should hard delete community as super admin', async () => {
      const mockCommunity = {
        name: 'Test Community',
        slug: 'test-community',
      };

      (prisma.community.findUnique as jest.Mock).mockResolvedValue(mockCommunity);
      (prisma.community.delete as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { communityId: '1' };
      mockRequest.body = { reason: 'Severe violation', permanent: true };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { role: 'SUPER_ADMIN', id: 'admin-id' };

      await communityManagementController.deleteCommunity(adminRequest, mockResponse as Response);

      expect(prisma.community.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'Community permanently deleted' },
      });
    });

    it('should return 403 for non-super admin', async () => {
      mockRequest.params = { communityId: '1' };
      mockRequest.body = { permanent: true };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { role: 'ADMIN', id: 'admin-id' };

      await communityManagementController.deleteCommunity(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Only super admins can delete communities',
      });
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership successfully', async () => {
      const mockUpdatedCommunity = {
        id: '1',
        name: 'Test Community',
        owner: {
          id: 'new-owner',
          username: 'newowner',
          email: 'newowner@test.com',
        },
        ownerId: 'new-owner',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'new-owner', isActive: true });
      (prisma.community.update as jest.Mock).mockResolvedValue(mockUpdatedCommunity);
      (prisma.communityMember.upsert as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { communityId: '1' };
      mockRequest.body = { newOwnerId: 'new-owner' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.transferOwnership(adminRequest, mockResponse as Response);

      expect(prisma.community.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { ownerId: 'new-owner' },
        include: expect.any(Object),
      });

      expect(prisma.communityMember.upsert).toHaveBeenCalledWith({
        where: {
          communityId_userId: {
            communityId: '1',
            userId: 'new-owner',
          },
        },
        update: { role: 'admin' },
        create: {
          communityId: '1',
          userId: 'new-owner',
          role: 'admin',
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockUpdatedCommunity });
    });

    it('should return 400 if new owner ID is missing', async () => {
      mockRequest.params = { communityId: '1' };
      mockRequest.body = {};

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.transferOwnership(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'New owner ID is required',
      });
    });

    it('should return 404 if new owner not found or inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { communityId: '1' };
      mockRequest.body = { newOwnerId: 'inactive-owner' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.transferOwnership(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'New owner not found or inactive',
      });
    });
  });

  describe('getCommunityStats', () => {
    it('should return community statistics successfully', async () => {
      const mockTopCommunities = [
        { id: '1', name: 'Top Community', memberCount: 100 },
        { id: '2', name: 'Second Top', memberCount: 80 },
      ];

      (prisma.community.count as jest.Mock)
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(40)  // public
        .mockResolvedValueOnce(10)  // private
        .mockResolvedValueOnce(15)  // paid
        .mockResolvedValueOnce(35)  // free
        .mockResolvedValueOnce(3);   // newToday

      (prisma.community.findMany as jest.Mock).mockResolvedValue(mockTopCommunities);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await communityManagementController.getCommunityStats(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          total: 50,
          public: 40,
          private: 10,
          paid: 15,
          free: 35,
          newToday: 3,
          topByMembers: mockTopCommunities,
        },
      });
    });
  });
});