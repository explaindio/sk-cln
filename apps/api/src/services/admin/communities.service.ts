import { prisma } from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';

interface CreateCommunityRequest {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  isPublic?: boolean;
  isPaid?: boolean;
  priceMonthly?: number;
  priceYearly?: number;
  ownerId: string;
}

interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  isPublic?: boolean;
  isPaid?: boolean;
  priceMonthly?: number;
  priceYearly?: number;
}

interface TransferOwnershipRequest {
  newOwnerId: string;
  reason?: string;
}

export class CommunitiesService {

  /**
   * GET COMMUNITIES
   */

  async getCommunities(options?: {
    page?: number;
    limit?: number;
    search?: string;
    isPublic?: boolean;
    isPaid?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      isPublic,
      isPaid,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isPublic !== undefined) where.isPublic = isPublic;
    if (isPaid !== undefined) where.isPaid = isPaid;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        include: {
          owner: {
            select: { id: true, username: true, email: true }
          },
          _count: {
            select: {
              members: true,
              posts: true,
              courses: true,
              events: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.community.count({ where })
    ]);

    return {
      success: true,
      data: communities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getCommunityById(communityId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        owner: {
          select: { id: true, username: true, email: true }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          },
          take: 20
        },
        posts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, username: true } }
          }
        },
        courses: {
          include: {
            _count: { select: { enrollments: true } }
          }
        },
        categories: true,
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true,
            events: true,
            categories: true
          }
        }
      }
    });

    if (!community) {
      throw new Error('Community not found');
    }

    return { success: true, data: community };
  }

  /**
   * CREATE COMMUNITY
   */

  async createCommunity(data: CreateCommunityRequest, adminId: string) {
    // Validate slug uniqueness
    const existingCommunity = await prisma.community.findUnique({
      where: { slug: data.slug }
    });

    if (existingCommunity) {
      throw new Error('Community with this slug already exists');
    }

    // Verify owner exists and is active
    const owner = await prisma.user.findUnique({
      where: { id: data.ownerId }
    });

    if (!owner || !owner.isActive) {
      throw new Error('Invalid or inactive owner');
    }

    const community = await prisma.community.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        logoUrl: data.logoUrl,
        coverUrl: data.coverUrl,
        isPublic: data.isPublic !== false,
        isPaid: data.isPaid || false,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        ownerId: data.ownerId
      },
      include: {
        owner: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // Add owner as member with admin role
    await prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: data.ownerId,
        role: 'admin'
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'COMMUNITY_CREATED', community.id, {
      name: community.name,
      slug: community.slug,
      ownerId: community.ownerId,
      isPublic: community.isPublic,
      isPaid: community.isPaid
    });

    return { success: true, data: community };
  }

  /**
   * UPDATE COMMUNITY
   */

  async updateCommunity(communityId: string, data: UpdateCommunityRequest, adminId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId }
    });

    if (!community) {
      throw new Error('Community not found');
    }

    const updatedCommunity = await prisma.community.update({
      where: { id: communityId },
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
        coverUrl: data.coverUrl,
        isPublic: data.isPublic,
        isPaid: data.isPaid,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly
      },
      include: {
        owner: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'COMMUNITY_UPDATED', communityId, {
      fieldsChanged: Object.keys(data),
      previousName: community.name,
      newName: updatedCommunity.name
    });

    return { success: true, data: updatedCommunity };
  }

  /**
   * DELETE COMMUNITY
   */

  async deleteCommunity(communityId: string, adminId: string, reason?: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true
          }
        }
      }
    });

    if (!community) {
      throw new Error('Community not found');
    }

    // Check if community has active content
    if (community._count.posts > 0 || community._count.courses > 0) {
      throw new Error('Cannot delete community with active content. Archive instead.');
    }

    await prisma.community.delete({
      where: { id: communityId }
    });

    // Log admin action
    await logAdminAction(adminId, 'COMMUNITY_DELETED', communityId, {
      name: community.name,
      slug: community.slug,
      memberCount: community._count.members,
      reason
    });

    return { success: true, message: 'Community deleted successfully' };
  }

  /**
   * TRANSFER OWNERSHIP
   */

  async transferOwnership(communityId: string, data: TransferOwnershipRequest, adminId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        owner: { select: { id: true, username: true } }
      }
    });

    if (!community) {
      throw new Error('Community not found');
    }

    // Verify new owner exists and is active
    const newOwner = await prisma.user.findUnique({
      where: { id: data.newOwnerId }
    });

    if (!newOwner || !newOwner.isActive) {
      throw new Error('Invalid or inactive new owner');
    }

    // Check if new owner is already a member
    const existingMembership = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: data.newOwnerId
        }
      }
    });

    // Update ownership
    const updatedCommunity = await prisma.community.update({
      where: { id: communityId },
      data: { ownerId: data.newOwnerId },
      include: {
        owner: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // Ensure new owner has admin role
    await prisma.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId,
          userId: data.newOwnerId
        }
      },
      update: { role: 'admin' },
      create: {
        communityId,
        userId: data.newOwnerId,
        role: 'admin'
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'COMMUNITY_OWNERSHIP_TRANSFERRED', communityId, {
      previousOwnerId: community.ownerId,
      previousOwnerUsername: community.owner.username,
      newOwnerId: data.newOwnerId,
      newOwnerUsername: newOwner.username,
      reason: data.reason
    });

    return { success: true, data: updatedCommunity };
  }

  /**
   * COMMUNITY MANAGEMENT
   */

  async toggleCommunityStatus(communityId: string, isActive: boolean, adminId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId }
    });

    if (!community) {
      throw new Error('Community not found');
    }

    const updatedCommunity = await prisma.community.update({
      where: { id: communityId },
      data: { isPublic: isActive }
    });

    // Log admin action
    await logAdminAction(adminId, `COMMUNITY_${isActive ? 'ACTIVATED' : 'DEACTIVATED'}`, communityId, {
      name: community.name,
      slug: community.slug
    });

    return { success: true, data: updatedCommunity };
  }

  /**
   * COMMUNITY ANALYTICS
   */

  async getCommunityAnalytics(communityId: string) {
    const [
      community,
      memberGrowth,
      contentStats,
      engagementStats
    ] = await Promise.all([
      this.getCommunityDetails(communityId),
      this.getMemberGrowth(communityId),
      this.getContentStats(communityId),
      this.getEngagementStats(communityId)
    ]);

    return {
      success: true,
      data: {
        community,
        memberGrowth,
        contentStats,
        engagementStats
      }
    };
  }

  private async getCommunityDetails(communityId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        owner: { select: { id: true, username: true } },
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true,
            events: true,
            categories: true
          }
        }
      }
    });

    if (!community) {
      throw new Error('Community not found');
    }

    return community;
  }

  private async getMemberGrowth(communityId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalMembers,
      newMembersLast30Days,
      memberActivity
    ] = await Promise.all([
      prisma.communityMember.count({ where: { communityId } }),
      prisma.communityMember.count({
        where: {
          communityId,
          joinedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.communityMember.findMany({
        where: { communityId },
        select: {
          joinedAt: true,
          points: true
        },
        orderBy: { joinedAt: 'desc' },
        take: 100
      })
    ]);

    return {
      totalMembers,
      newMembersLast30Days,
      memberActivity: memberActivity.slice(0, 10)
    };
  }

  private async getContentStats(communityId: string) {
    const [
      postStats,
      courseStats,
      categoryStats
    ] = await Promise.all([
      prisma.post.aggregate({
        where: { communityId },
        _count: { id: true },
        _sum: { viewCount: true, likeCount: true }
      }),
      prisma.course.aggregate({
        where: { communityId },
        _count: { id: true },
        _sum: {}
      }),
      prisma.category.count({ where: { communityId } })
    ]);

    return {
      totalPosts: postStats._count.id,
      totalViews: postStats._sum.viewCount || 0,
      totalLikes: postStats._sum.likeCount || 0,
      totalCourses: courseStats._count.id,
      totalCategories: categoryStats
    };
  }

  private async getEngagementStats(communityId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      activeMembers,
      recentPosts,
      recentComments
    ] = await Promise.all([
      prisma.communityMember.count({
        where: {
          communityId,
          user: { lastActive: { gte: sevenDaysAgo } }
        }
      }),
      prisma.post.count({
        where: {
          communityId,
          createdAt: { gte: sevenDaysAgo }
        }
      }),
      prisma.comment.count({
        where: {
          post: { communityId },
          createdAt: { gte: sevenDaysAgo }
        }
      })
    ]);

    return {
      activeMembersLast7Days: activeMembers,
      postsLast7Days: recentPosts,
      commentsLast7Days: recentComments
    };
  }
}

export const communitiesService = new CommunitiesService();