import { prisma } from '../../lib/prisma';
import { logAdminAction, logSecurityEvent } from '../../utils/auditLogger';
import { UserRole } from '@prisma/client';

interface CreateUserRequest {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

interface UpdateUserRequest {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  bio?: string;
  avatarUrl?: string;
}

interface BanUserRequest {
  reason: string;
  duration?: number; // in days
}

export class UsersService {

  /**
   * GET USERS
   */

  async getUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          communities: {
            include: {
              community: { select: { id: true, name: true, slug: true } }
            }
          },
          bannedUserRecord: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              moderationLogs: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        communities: {
          include: {
            community: true
          }
        },
        posts: { take: 5, orderBy: { createdAt: 'desc' } },
        comments: { take: 5, orderBy: { createdAt: 'desc' } },
        moderationLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            moderator: { select: { id: true, username: true } }
          }
        },
        bannedUserRecord: true,
        auditLogs: { take: 10, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { success: true, data: user };
  }

  /**
   * CREATE USER
   */

  async createUser(data: CreateUserRequest, adminId: string) {
    // Validate email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate username uniqueness
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (existingUsername) {
      throw new Error('Username already taken');
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || UserRole.USER,
        isActive: data.isActive !== false
      },
      include: {
        communities: {
          include: { community: { select: { id: true, name: true } } }
        }
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'USER_CREATED', user.id, {
      email: user.email,
      username: user.username,
      role: user.role
    });

    return { success: true, data: user };
  }

  /**
   * UPDATE USER
   */

  async updateUser(userId: string, data: UpdateUserRequest, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Check for email uniqueness if email is being changed
    if (data.email && data.email !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email }
      });
      if (existingEmail) {
        throw new Error('Email already in use');
      }
    }

    // Check for username uniqueness if username is being changed
    if (data.username && data.username !== user.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: data.username }
      });
      if (existingUsername) {
        throw new Error('Username already taken');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
        bio: data.bio,
        avatarUrl: data.avatarUrl
      },
      include: {
        communities: {
          include: { community: { select: { id: true, name: true } } }
        }
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'USER_UPDATED', userId, {
      previousRole: user.role,
      newRole: updatedUser.role,
      fieldsChanged: Object.keys(data)
    });

    return { success: true, data: updatedUser };
  }

  /**
   * DELETE USER (soft delete)
   */

  async deleteUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete by updating deletedAt
    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'USER_DELETED', userId, {
      email: user.email,
      username: user.username
    });

    return { success: true, message: 'User deleted successfully' };
  }

  /**
   * USER MODERATION
   */

  async banUser(userId: string, data: BanUserRequest, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const bannedUntil = data.duration
      ? new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000)
      : null;

    // Create or update ban record
    const bannedUser = await prisma.bannedUser.upsert({
      where: { userId },
      update: {
        reason: data.reason,
        bannedBy: adminId,
        bannedUntil
      },
      create: {
        userId,
        reason: data.reason,
        bannedBy: adminId,
        bannedUntil
      }
    });

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    // Log admin action
    await logAdminAction(adminId, 'USER_BANNED', userId, {
      reason: data.reason,
      duration: data.duration,
      bannedUntil
    });

    // Log security event
    await logSecurityEvent('USER_BANNED', 'MEDIUM', {
      userId,
      reason: data.reason,
      bannedBy: adminId
    });

    return { success: true, data: bannedUser };
  }

  async unbanUser(userId: string, adminId: string) {
    const bannedUser = await prisma.bannedUser.findUnique({
      where: { userId }
    });

    if (!bannedUser) {
      throw new Error('User is not banned');
    }

    // Remove ban record
    await prisma.bannedUser.delete({
      where: { userId }
    });

    // Reactivate user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    // Log admin action
    await logAdminAction(adminId, 'USER_UNBANNED', userId, {
      previousReason: bannedUser.reason
    });

    return { success: true, message: 'User unbanned successfully' };
  }

  /**
   * USER ANALYTICS
   */

  async getUserAnalytics(userId: string) {
    const [
      userStats,
      recentActivity,
      communityActivity
    ] = await Promise.all([
      this.getUserStats(userId),
      this.getUserRecentActivity(userId),
      this.getUserCommunityActivity(userId)
    ]);

    return {
      success: true,
      data: {
        stats: userStats,
        recentActivity,
        communityActivity
      }
    };
  }

  private async getUserStats(userId: string) {
    const [
      postCount,
      commentCount,
      pointsTotal,
      achievementsCount,
      lastActive
    ] = await Promise.all([
      prisma.post.count({ where: { authorId: userId } }),
      prisma.comment.count({ where: { authorId: userId } }),
      prisma.points.aggregate({
        where: { userId },
        _sum: { amount: true }
      }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { lastActive: true }
      })
    ]);

    return {
      postsCount: postCount,
      commentsCount: commentCount,
      totalPoints: pointsTotal._sum.amount || 0,
      achievementsCount,
      lastActive: lastActive?.lastActive
    };
  }

  private async getUserRecentActivity(userId: string) {
    const [
      recentPosts,
      recentComments,
      recentPoints
    ] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          viewCount: true,
          likeCount: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.comment.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          likeCount: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.points.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      recentPosts,
      recentComments,
      recentPoints
    };
  }

  private async getUserCommunityActivity(userId: string) {
    const memberships = await prisma.communityMember.findMany({
      where: { userId },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            memberCount: true
          }
        }
      }
    });

    const communityStats = await Promise.all(
      memberships.map(async (membership) => {
        const [
          postCount,
          commentCount,
          pointsInCommunity
        ] = await Promise.all([
          prisma.post.count({
            where: {
              authorId: userId,
              communityId: membership.communityId
            }
          }),
          prisma.comment.count({
            where: {
              authorId: userId,
              post: { communityId: membership.communityId }
            }
          }),
          prisma.points.aggregate({
            where: {
              userId,
              communityId: membership.communityId
            },
            _sum: { amount: true }
          })
        ]);

        return {
          communityId: membership.communityId,
          communityName: membership.community.name,
          role: membership.role,
          joinedAt: membership.joinedAt,
          points: membership.points,
          postsCount: postCount,
          commentsCount: commentCount,
          totalPoints: pointsInCommunity._sum.amount || 0
        };
      })
    );

    return communityStats;
  }
}

export const usersService = new UsersService();