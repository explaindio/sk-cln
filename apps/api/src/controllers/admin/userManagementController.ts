import { Response } from 'express';
import { BaseController } from '../baseController';
import { prisma } from '../../lib/prisma';
import { AdminRequest } from '../../middleware/admin';
import { UserRole, User } from '@prisma/client';
import bcrypt from 'bcrypt';

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  role?: UserRole;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}

class UserManagementController extends BaseController {
  /**
   * GET /api/admin/users
   * Get paginated list of users for admin management
   */
  async getUsers(req: AdminRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role = '',
        isActive = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      // Search functionality
      if (search) {
        where.OR = [
          { username: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Role filter
      if (role && Object.values(UserRole).includes(role as UserRole)) {
        where.role = role;
      }

      // Active status filter
      if (isActive !== '') {
        where.isActive = isActive === 'true';
      }

      // Sorting
      const orderBy = {};
      if (['username', 'email', 'createdAt', 'lastActive'].includes(sortBy as string)) {
        orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isEmailVerified: true,
            createdAt: true,
            lastActive: true,
            deletedAt: true,
            _count: {
              select: {
                posts: true,
                comments: true,
                communities: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: limitNum
        }),
        prisma.user.count({ where })
      ]);

      this.sendPaginated(res, users, pageNum, limitNum, total);
    } catch (error: any) {
      console.error('Failed to get users:', error);
      this.sendError(res, 'Failed to fetch users', 500);
    }
  }

  /**
   * GET /api/admin/users/:userId
   * Get detailed user information
   */
  async getUser(req: AdminRequest, res: Response) {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          bio: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastActive: true,
          deletedAt: true,
          bannedUser: {
            select: {
              banReason: true,
              bannedUntil: true,
              bannedBy: true,
              appealStatus: true,
              appealNotes: true
            }
          },
          _count: {
            select: {
              posts: true,
              comments: true,
              communities: true,
              moderationLogs: true
            }
          }
        }
      });

      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      // Get recent activity
      const recentPosts = await prisma.post.findMany({
        where: { authorId: userId },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      const recentActivity = await prisma.auditLog.findMany({
        where: { userId },
        select: { action: true, target: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      this.sendSuccess(res, {
        ...user,
        recentPosts,
        recentActivity
      });
    } catch (error: any) {
      console.error('Failed to get user:', error);
      this.sendError(res, 'Failed to fetch user details', 500);
    }
  }

  /**
   * POST /api/admin/users
   * Create a new user (admin only)
   */
  async createUser(req: AdminRequest, res: Response) {
    try {
      const userData: CreateUserRequest = req.body;

      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        return this.sendError(res, 'Username, email, and password are required', 400);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: userData.username },
            { email: userData.email }
          ]
        }
      });

      if (existingUser) {
        return this.sendError(res, 'User with this username or email already exists', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          bio: userData.bio,
          role: userData.role || UserRole.USER,
          isActive: true,
          isEmailVerified: true // Admin-created accounts are automatically verified
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      // Log the action
      await this.logAdminAction(req.admin.id, 'USER_CREATED', user.id, {
        username: user.username,
        role: user.role
      });

      this.sendSuccess(res, user, 201);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      this.sendError(res, 'Failed to create user', 500);
    }
  }

  /**
   * PUT /api/admin/users/:userId
   * Update a user
   */
  async updateUser(req: AdminRequest, res: Response) {
    try {
      const { userId } = req.params;
      const updates: UpdateUserRequest = req.body;

      // Remove empty fields
      Object.keys(updates).forEach(key => {
        if (updates[key] === null || updates[key] === undefined || updates[key] === '') {
          delete updates[key];
        }
      });

      // If updating password, hash it
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updates,
          passwordHash: updates.password || undefined
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          bio: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      });

      // Log the action
      await this.logAdminAction(req.admin.id, 'USER_UPDATED', user.id, updates);

      this.sendSuccess(res, user);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'User not found', 404);
      }
      this.sendError(res, 'Failed to update user', 500);
    }
  }

  /**
   * DELETE /api/admin/users/:userId
   * Delete a user (admin only)
   */
  async deleteUser(req: AdminRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, permanent = false } = req.body;

      if (req.admin.role !== UserRole.SUPER_ADMIN) {
        return this.sendError(res, 'Only super admins can delete users', 403);
      }

      if (permanent) {
        // Permanent deletion (only for super admins in extreme cases)
        await prisma.user.delete({
          where: { id: userId }
        });
      } else {
        // Soft deletion
        await prisma.user.update({
          where: { id: userId },
          data: {
            deletedAt: new Date(),
            isActive: false
          }
        });
      }

      await this.logAdminAction(req.admin.id, permanent ? 'USER_PERMANENT_DELETED' : 'USER_SOFT_DELETED', userId, {
        permanent,
        reason
      });

      this.sendSuccess(res, {
        message: permanent ? 'User permanently deleted' : 'User deactivated'
      });
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'User not found', 404);
      }
      this.sendError(res, 'Failed to delete user', 500);
    }
  }

  /**
   * POST /api/admin/users/:userId/ban
   * Ban a user
   */
  async banUser(req: AdminRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, duration, appealAllowed = true } = req.body;

      if (!reason) {
        return this.sendError(res, 'Ban reason is required', 400);
      }

      // TODO: Integrate with userModerationService once it's properly integrated
      // For now, do it directly
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      // Log the ban
      await prisma.moderationLog.create({
        data: {
          action: 'BAN',
          targetType: 'user',
          targetId: userId,
          moderatorId: req.admin.id,
          reason,
          metadata: { duration, appealAllowed }
        }
      });

      await this.logAdminAction(req.admin.id, 'USER_BANNED', userId, {
        reason,
        duration
      });

      this.sendSuccess(res, { message: 'User banned successfully' });
    } catch (error: any) {
      console.error('Failed to ban user:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'User not found', 404);
      }
      this.sendError(res, 'Failed to ban user', 500);
    }
  }

  /**
   * POST /api/admin/users/:userId/unban
   * Unban a user
   */
  async unbanUser(req: AdminRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true }
      });

      // Log the unban
      await prisma.moderationLog.create({
        data: {
          action: 'UNBAN',
          targetType: 'user',
          targetId: userId,
          moderatorId: req.admin.id,
          reason: reason || 'Appeal approved'
        }
      });

      await this.logAdminAction(req.admin.id, 'USER_UNBANNED', userId, { reason });

      this.sendSuccess(res, { message: 'User unbanned successfully' });
    } catch (error: any) {
      console.error('Failed to unban user:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'User not found', 404);
      }
      this.sendError(res, 'Failed to unban user', 500);
    }
  }

  /**
   * GET /api/admin/users/stats
   * Get user management statistics
   */
  async getUserStats(req: AdminRequest, res: Response) {
    try {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      const bannedUsers = await prisma.user.count({ where: { isActive: false } });
      const newUsersToday = await prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      const roleStats = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      });

      this.sendSuccess(res, {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        newToday: newUsersToday,
        byRole: roleStats.reduce((acc, stat) => {
          acc[stat.role] = stat._count.role;
          return acc;
        }, {} as Record<string, number>)
      });
    } catch (error: any) {
      console.error('Failed to get user stats:', error);
      this.sendError(res, 'Failed to get user statistics', 500);
    }
  }

  /**
   * Helper method to log admin actions
   */
  private async logAdminAction(userId: string, action: string, targetId?: string, details?: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          target: 'USER',
          targetId,
          details,
          ipAddress: '', // This should come from middleware
          userAgent: '' // This should come from middleware
        }
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }
}

export const userManagementController = new UserManagementController();