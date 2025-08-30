import { prisma } from '../../lib/prisma';
import { usersService } from '../../services/admin/users.service';
import { UserRole } from '@prisma/client';

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    bannedUser: {
      upsert: jest.fn(),
      delete: jest.fn()
    },
    post: {
      count: jest.fn(),
      aggregate: jest.fn()
    },
    comment: {
      count: jest.fn()
    },
    userAchievement: {
      count: jest.fn()
    },
    points: {
      aggregate: jest.fn()
    },
    communityMember: {
      findMany: jest.fn()
    }
  }
}));

// Mock audit logger
jest.mock('../../utils/auditLogger', () => ({
  logAdminAction: jest.fn(),
  logSecurityEvent: jest.fn()
}));

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should retrieve users with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          communities: [],
          bannedUserRecord: null,
          _count: {
            posts: 5,
            comments: 10,
            moderationLogs: 2
          }
        }
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await usersService.getUsers({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should handle search filters', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await usersService.getUsers({ search: 'john' });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { username: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    it('should handle role and status filters', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await usersService.getUsers({
        role: UserRole.ADMIN,
        isActive: true
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: UserRole.ADMIN,
          isActive: true
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        username: 'newuser',
        role: UserRole.USER,
        isActive: true
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(null); // Username check

      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.communityMember.create as jest.Mock).mockResolvedValue({});

      const result = await usersService.createUser({
        email: 'newuser@example.com',
        username: 'newuser',
        role: UserRole.USER
      }, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          username: 'newuser',
          role: UserRole.USER
        }),
        include: expect.any(Object)
      });
    });

    it('should throw error if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com'
      });

      await expect(usersService.createUser({
        email: 'existing@example.com',
        username: 'newuser'
      }, 'admin-123')).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if username already exists', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce({ id: 'existing-user' }); // Username check

      await expect(usersService.createUser({
        email: 'newuser@example.com',
        username: 'existinguser'
      }, 'admin-123')).rejects.toThrow('Username already taken');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'old@example.com',
        username: 'olduser',
        role: UserRole.USER
      };

      const updatedUser = {
        ...existingUser,
        email: 'new@example.com'
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // Email uniqueness check
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await usersService.updateUser('user-123', {
        email: 'new@example.com'
      }, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('new@example.com');
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(usersService.updateUser('nonexistent', {
        email: 'new@example.com'
      }, 'admin-123')).rejects.toThrow('User not found');
    });

    it('should throw error if new email already exists', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'user-123', email: 'old@example.com' }) // User exists
        .mockResolvedValueOnce({ id: 'other-user', email: 'taken@example.com' }); // Email taken

      await expect(usersService.updateUser('user-123', {
        email: 'taken@example.com'
      }, 'admin-123')).rejects.toThrow('Email already in use');
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        isActive: true
      };

      const mockBannedUser = {
        id: 'ban-123',
        userId: 'user-123',
        reason: 'Violation',
        bannedBy: 'admin-123',
        bannedUntil: null
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.bannedUser.upsert as jest.Mock).mockResolvedValue(mockBannedUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      const result = await usersService.banUser('user-123', {
        reason: 'Violation',
        duration: 7
      }, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBannedUser);
      expect(prisma.bannedUser.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        update: expect.objectContaining({
          reason: 'Violation',
          bannedUntil: expect.any(Date)
        }),
        create: expect.objectContaining({
          userId: 'user-123',
          reason: 'Violation'
        })
      });
    });

    it('should handle permanent bans', async () => {
      const mockUser = { id: 'user-123', isActive: true };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.bannedUser.upsert as jest.Mock).mockResolvedValue({});

      await usersService.banUser('user-123', {
        reason: 'Severe violation'
      }, 'admin-123');

      expect(prisma.bannedUser.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        update: expect.objectContaining({
          bannedUntil: null
        }),
        create: expect.objectContaining({
          bannedUntil: null
        })
      });
    });
  });

  describe('unbanUser', () => {
    it('should unban user successfully', async () => {
      const mockBannedUser = {
        id: 'ban-123',
        reason: 'Violation'
      };

      (prisma.bannedUser.findUnique as jest.Mock).mockResolvedValue(mockBannedUser);
      (prisma.bannedUser.delete as jest.Mock).mockResolvedValue({});
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await usersService.unbanUser('user-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(prisma.bannedUser.delete).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isActive: true }
      });
    });

    it('should throw error if user is not banned', async () => {
      (prisma.bannedUser.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(usersService.unbanUser('user-123', 'admin-123'))
        .rejects.toThrow('User is not banned');
    });
  });

  describe('getUserAnalytics', () => {
    it('should retrieve comprehensive user analytics', async () => {
      const mockPostCount = 15;
      const mockCommentCount = 42;
      const mockPointsTotal = { _sum: { amount: 1250 } };
      const mockAchievementsCount = 8;
      const mockLastActive = { lastActive: new Date('2024-01-15') };

      (prisma.post.count as jest.Mock).mockResolvedValue(mockPostCount);
      (prisma.comment.count as jest.Mock).mockResolvedValue(mockCommentCount);
      (prisma.points.aggregate as jest.Mock).mockResolvedValue(mockPointsTotal);
      (prisma.userAchievement.count as jest.Mock).mockResolvedValue(mockAchievementsCount);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockLastActive);

      const result = await usersService.getUserAnalytics('user-123');

      expect(result.success).toBe(true);
      expect(result.data.stats).toEqual({
        postsCount: mockPostCount,
        commentsCount: mockCommentCount,
        totalPoints: mockPointsTotal._sum.amount,
        achievementsCount: mockAchievementsCount,
        lastActive: mockLastActive.lastActive
      });
    });

    it('should handle users with no points', async () => {
      (prisma.post.count as jest.Mock).mockResolvedValue(0);
      (prisma.comment.count as jest.Mock).mockResolvedValue(0);
      (prisma.points.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: null } });
      (prisma.userAchievement.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ lastActive: null });

      const result = await usersService.getUserAnalytics('user-123');

      expect(result.data.stats.totalPoints).toBe(0);
    });
  });

  describe('audit logging', () => {
    const { logAdminAction, logSecurityEvent } = require('../../utils/auditLogger');

    it('should log user creation', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'user-123' });

      await usersService.createUser({
        email: 'test@example.com',
        username: 'testuser'
      }, 'admin-123');

      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'USER_CREATED', 'user-123', {
        email: 'test@example.com',
        username: 'testuser',
        role: undefined
      });
    });

    it('should log user ban with security event', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (prisma.bannedUser.upsert as jest.Mock).mockResolvedValue({});

      await usersService.banUser('user-123', { reason: 'Violation' }, 'admin-123');

      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'USER_BANNED', 'user-123', {
        reason: 'Violation',
        duration: undefined,
        bannedUntil: null
      });

      expect(logSecurityEvent).toHaveBeenCalledWith('USER_BANNED', 'MEDIUM', {
        userId: 'user-123',
        reason: 'Violation',
        bannedBy: 'admin-123'
      });
    });
  });
});