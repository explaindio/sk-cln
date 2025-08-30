import { Response } from 'express';
import { BaseController } from '../baseController';
import { prisma } from '../../lib/prisma';
import { AdminRequest } from '../../middleware/admin';

interface CreateCommunityRequest {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  isPublic?: boolean;
  isPaid?: boolean;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
}

interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  isPaid?: boolean;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
}

class CommunityManagementController extends BaseController {
  /**
   * GET /api/admin/communities
   * Get paginated list of communities for admin management
   */
  async getCommunities(req: AdminRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        isPublic = '',
        isPaid = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      // Search functionality
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Public/Private filter
      if (isPublic !== '') {
        where.isPublic = isPublic === 'true';
      }

      // Paid/Free filter
      if (isPaid !== '') {
        where.isPaid = isPaid === 'true';
      }

      // Sorting
      const orderBy = {};
      if (['name', 'createdAt', 'memberCount'].includes(sortBy as string)) {
        orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
      } else {
        orderBy.createdAt = 'desc';
      }

      const [communities, total] = await Promise.all([
        prisma.community.findMany({
          where,
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                members: true,
                posts: true,
                courses: true
              }
            }
          },
          orderBy,
          skip: offset,
          take: limitNum
        }),
        prisma.community.count({ where })
      ]);

      this.sendPaginated(res, communities, pageNum, limitNum, total);
    } catch (error: any) {
      console.error('Failed to get communities:', error);
      this.sendError(res, 'Failed to fetch communities', 500);
    }
  }

  /**
   * GET /api/admin/communities/:communityId
   * Get detailed community information
   */
  async getCommunity(req: AdminRequest, res: Response) {
    try {
      const { communityId } = req.params;

      const community = await prisma.community.findUnique({
        where: { id: communityId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  role: true
                }
              }
            },
            take: 20,
            orderBy: { joinedAt: 'desc' }
          },
          categories: true,
          _count: {
            select: {
              members: true,
              posts: true,
              courses: true,
              leaderboard: true
            }
          }
        }
      });

      if (!community) {
        return this.sendError(res, 'Community not found', 404);
      }

      // Get recent activity
      const recentPosts = await prisma.post.findMany({
        where: { communityId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: {
            select: { username: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get community statistics
      const [
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers
      ] = await Promise.all([
        prisma.communityMember.count({
          where: {
            communityId,
            user: {
              lastActive: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
          }
        }),
        prisma.communityMember.count({
          where: {
            communityId,
            user: {
              lastActive: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          }
        }),
        prisma.communityMember.count({
          where: {
            communityId,
            user: {
              lastActive: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          }
        })
      ]);

      this.sendSuccess(res, {
        ...community,
        recentPosts,
        stats: {
          dailyActiveUsers,
          weeklyActiveUsers,
          monthlyActiveUsers
        }
      });
    } catch (error: any) {
      console.error('Failed to get community:', error);
      this.sendError(res, 'Failed to fetch community details', 500);
    }
  }

  /**
   * POST /api/admin/communities
   * Create a new community (admin only)
   */
  async createCommunity(req: AdminRequest, res: Response) {
    try {
      const communityData: CreateCommunityRequest = req.body;

      // Validate required fields
      if (!communityData.name || !communityData.slug || !communityData.ownerId) {
        return this.sendError(res, 'Name, slug, and owner ID are required', 400);
      }

      // Check if slug is unique
      const existingCommunity = await prisma.community.findUnique({
        where: { slug: communityData.slug }
      });

      if (existingCommunity) {
        return this.sendError(res, 'Community with this slug already exists', 409);
      }

      // Verify owner exists
      const owner = await prisma.user.findUnique({
        where: { id: communityData.ownerId }
      });

      if (!owner) {
        return this.sendError(res, 'Specified owner does not exist', 404);
      }

      const community = await prisma.community.create({
        data: {
          name: communityData.name,
          slug: communityData.slug,
          description: communityData.description,
          ownerId: communityData.ownerId,
          isPublic: communityData.isPublic ?? true,
          isPaid: communityData.isPaid ?? false,
          priceMonthly: communityData.priceMonthly,
          priceYearly: communityData.priceYearly,
          currency: communityData.currency || 'USD',
          memberCount: 1 // Include the owner
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      // Add owner as member
      await prisma.communityMember.create({
        data: {
          communityId: community.id,
          userId: communityData.ownerId,
          role: 'admin'
        }
      });

      // Log the action
      await this.logAdminAction(req.admin.id, 'COMMUNITY_CREATED', community.id, {
        name: community.name,
        slug: community.slug,
        ownerId: communityData.ownerId
      });

      this.sendSuccess(res, community, 201);
    } catch (error: any) {
      console.error('Failed to create community:', error);
      this.sendError(res, 'Failed to create community', 500);
    }
  }

  /**
   * PUT /api/admin/communities/:communityId
   * Update a community
   */
  async updateCommunity(req: AdminRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const updates: UpdateCommunityRequest = req.body;

      // Remove empty fields
      Object.keys(updates).forEach(key => {
        if (updates[key] === null || updates[key] === undefined || updates[key] === '') {
          delete updates[key];
        }
      });

      // If updating slug, check uniqueness
      if (updates.slug) {
        const existingCommunity = await prisma.community.findFirst({
          where: {
            slug: updates.slug,
            id: { not: communityId }
          }
        });

        if (existingCommunity) {
          return this.sendError(res, 'Community with this slug already exists', 409);
        }
      }

      const community = await prisma.community.update({
        where: { id: communityId },
        data: updates,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      // Log the action
      await this.logAdminAction(req.admin.id, 'COMMUNITY_UPDATED', community.id, updates);

      this.sendSuccess(res, community);
    } catch (error: any) {
      console.error('Failed to update community:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'Community not found', 404);
      }
      this.sendError(res, 'Failed to update community', 500);
    }
  }

  /**
   * DELETE /api/admin/communities/:communityId
   * Delete a community (admin only)
   */
  async deleteCommunity(req: AdminRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const { reason, permanent = false } = req.body;

      if (req.admin.role !== 'SUPER_ADMIN') {
        return this.sendError(res, 'Only super admins can delete communities', 403);
      }

      // Get community info before deletion
      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: { name: true, slug: true }
      });

      if (permanent) {
        // This will cascade delete all related data due to schema relations
        await prisma.community.delete({
          where: { id: communityId }
        });
      } else {
        // Soft deletion - rename and make private
        await prisma.community.update({
          where: { id: communityId },
          data: {
            name: `[DELETED] ${community?.name || 'Community'}`,
            slug: `deleted-${communityId.slice(0, 8)}`,
            isPublic: false,
            description: 'This community has been deleted.'
          }
        });
      }

      await this.logAdminAction(req.admin.id, permanent ? 'COMMUNITY_PERMANENT_DELETED' : 'COMMUNITY_SOFT_DELETED', communityId, {
        permanent,
        reason,
        communityName: community?.name
      });

      this.sendSuccess(res, {
        message: permanent ? 'Community permanently deleted' : 'Community deactivated'
      });
    } catch (error: any) {
      console.error('Failed to delete community:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'Community not found', 404);
      }
      this.sendError(res, 'Failed to delete community', 500);
    }
  }

  /**
   * POST /api/admin/communities/:communityId/transfer
   * Transfer community ownership
   */
  async transferOwnership(req: AdminRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        return this.sendError(res, 'New owner ID is required', 400);
      }

      // Verify new owner exists and is active
      const newOwner = await prisma.user.findUnique({
        where: { id: newOwnerId }
      });

      if (!newOwner || !newOwner.isActive) {
        return this.sendError(res, 'New owner not found or inactive', 404);
      }

      // Update community ownership
      const community = await prisma.community.update({
        where: { id: communityId },
        data: { ownerId: newOwnerId },
        include: {
          owner: { select: { id: true, username: true, email: true } }
        }
      });

      // Update member's role
      await prisma.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId,
            userId: newOwnerId
          }
        },
        update: { role: 'admin' },
        create: {
          communityId,
          userId: newOwnerId,
          role: 'admin'
        }
      });

      await this.logAdminAction(req.admin.id, 'COMMUNITY_OWNERSHIP_TRANSFERRED', communityId, {
        oldOwnerId: community.ownerId,
        newOwnerId
      });

      this.sendSuccess(res, community);
    } catch (error: any) {
      console.error('Failed to transfer community ownership:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'Community not found', 404);
      }
      this.sendError(res, 'Failed to transfer ownership', 500);
    }
  }

  /**
   * GET /api/admin/communities/stats
   * Get community management statistics
   */
  async getCommunityStats(req: AdminRequest, res: Response) {
    try {
      const [
        totalCommunities,
        publicCommunities,
        privateCommunities,
        paidCommunities,
        freeCommunities,
        newCommunitiesToday,
        topCommunitiesByMembers
      ] = await Promise.all([
        prisma.community.count(),
        prisma.community.count({ where: { isPublic: true } }),
        prisma.community.count({ where: { isPublic: false } }),
        prisma.community.count({ where: { isPaid: true } }),
        prisma.community.count({ where: { isPaid: false } }),
        prisma.community.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.community.findMany({
          select: {
            id: true,
            name: true,
            memberCount: true
          },
          orderBy: { memberCount: 'desc' },
          take: 10
        })
      ]);

      this.sendSuccess(res, {
        total: totalCommunities,
        public: publicCommunities,
        private: privateCommunities,
        paid: paidCommunities,
        free: freeCommunities,
        newToday: newCommunitiesToday,
        topByMembers: topCommunitiesByMembers
      });
    } catch (error: any) {
      console.error('Failed to get community stats:', error);
      this.sendError(res, 'Failed to get community statistics', 500);
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
          target: 'COMMUNITY',
          targetId,
          details,
          ipAddress: '',
          userAgent: ''
        }
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }
}

export const communityManagementController = new CommunityManagementController();