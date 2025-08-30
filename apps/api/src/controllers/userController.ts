import { Response } from 'express';
import { BaseController } from './baseController';
import { userService } from '../services/userService';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

class UserController extends BaseController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const { username } = req.params;

      const user = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              communities: true,
            },
          },
        },
      });

      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      this.sendSuccess(res, user);
    } catch (error) {
      this.sendError(res, 'Failed to fetch profile', 500);
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { firstName, lastName, bio, avatarUrl } = req.body;

      // Validate input
      if (firstName && firstName.length > 50) {
        return this.sendError(res, 'First name must be less than 50 characters', 400);
      }
      
      if (lastName && lastName.length > 50) {
        return this.sendError(res, 'Last name must be less than 50 characters', 400);
      }
      
      if (bio && bio.length > 500) {
        return this.sendError(res, 'Bio must be less than 500 characters', 400);
      }
      
      if (avatarUrl && avatarUrl.length > 2048) {
        return this.sendError(res, 'Avatar URL must be less than 2048 characters', 400);
      }

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          firstName,
          lastName,
          bio,
          avatarUrl,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatarUrl: true,
        },
      });

      this.sendSuccess(res, updated);
    } catch (error) {
      this.sendError(res, 'Failed to update profile', 500);
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return this.sendError(res, 'Current password and new password are required', 400);
      }

      if (newPassword.length < 8) {
        return this.sendError(res, 'New password must be at least 8 characters', 400);
      }

      // Change password using userService
      await userService.changePassword(req.user.id, currentPassword, newPassword);

      this.sendSuccess(res, { message: 'Password changed successfully' });
    } catch (error: any) {
      if (error.message === 'User not found') {
        return this.sendError(res, 'User not found', 404);
      }
      if (error.message === 'Current password is incorrect') {
        return this.sendError(res, 'Current password is incorrect', 400);
      }
      this.sendError(res, 'Failed to change password', 500);
    }
  }

  async getUserCommunities(req: AuthRequest, res: Response) {
    try {
      const communities = await prisma.communityMember.findMany({
        where: { userId: req.user.id },
        include: {
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              memberCount: true,
            },
          },
        },
      });

      this.sendSuccess(res, communities);
    } catch (error) {
      this.sendError(res, 'Failed to fetch communities', 500);
    }
  }

  // async getUserPreferences(req: AuthRequest, res: Response) {
  //   try {
  //     const preferences = await prisma.userPreferences.upsert({
  //       where: { userId: req.user.id },
  //       update: {},
  //       create: { userId: req.user.id },
  //       select: {
  //         showLeaderboard: true,
  //         emailNotifications: true,
  //         pushNotifications: true,
  //       },
  //     });

  //     this.sendSuccess(res, preferences);
  //   } catch (error) {
  //     this.sendError(res, 'Failed to fetch preferences', 500);
  //   }
  // }

  // async updateUserPreferences(req: AuthRequest, res: Response) {
  //   try {
  //     const { showLeaderboard, emailNotifications, pushNotifications } = req.body;

  //     const preferences = await prisma.userPreferences.upsert({
  //       where: { userId: req.user.id },
  //       update: {
  //         showLeaderboard,
  //         emailNotifications,
  //         pushNotifications,
  //       },
  //       create: {
  //         userId: req.user.id,
  //         showLeaderboard: showLeaderboard ?? true,
  //         emailNotifications: emailNotifications ?? true,
  //         pushNotifications: pushNotifications ?? true,
  //       },
  //       select: {
  //         showLeaderboard: true,
  //         emailNotifications: true,
  //         pushNotifications: true,
  //       },
  //     });

  //     this.sendSuccess(res, preferences);
  //   } catch (error) {
  //     this.sendError(res, 'Failed to update preferences', 500);
  //   }
  // }

  async searchUsers(req: AuthRequest, res: Response) {
    try {
      const { q } = req.query;
      const query = q as string;

      if (!query || query.length < 1) {
        return this.sendSuccess(res, []);
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              firstName: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
        take: 10,
        orderBy: {
          username: 'asc',
        },
      });

      this.sendSuccess(res, users);
    } catch (error) {
      this.sendError(res, 'Failed to search users', 500);
    }
  }
}

export const userController = new UserController();