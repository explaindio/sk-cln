import { prisma } from '../lib/prisma';

export class CommunityService {
  async create(data: {
    name: string;
    slug: string;
    description?: string;
    ownerId: string;
    isPublic?: boolean;
  }) {
    const community = await prisma.community.create({
      data,
    });

    // Add owner as member
    await prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: data.ownerId,
        role: 'owner',
      },
    });

    return community;
  }

  async findBySlug(slug: string) {
    return await prisma.community.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async findById(id: string) {
    return await prisma.community.findUnique({
      where: { id },
    });
  }

  async listPublic(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where: { isPublic: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.community.count({ where: { isPublic: true } }),
    ]);

    return { communities, total };
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    isPublic: boolean;
    logoUrl: string;
    coverUrl: string;
    isPaid: boolean;
    priceMonthly: number;
    priceYearly: number;
  }>) {
    return await prisma.community.update({
      where: { id },
      data,
    });
  }

  async updateSettings(id: string, data: Partial<{
    name: string;
    description: string;
    isPublic: boolean;
    logoUrl: string;
    coverUrl: string;
    isPaid: boolean;
    priceMonthly: number;
    priceYearly: number;
  }>) {
    return await prisma.community.update({
      where: { id },
      data,
    });
  }

  async getMembers(communityId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.communityMember.findMany({
        where: { communityId },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      }),
      prisma.communityMember.count({ where: { communityId } }),
    ]);

    return { members, total };
  }

  async searchMembers(communityId: string, query: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.communityMember.findMany({
        where: {
          communityId,
          user: {
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
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      }),
      prisma.communityMember.count({
        where: {
          communityId,
          user: {
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
        },
      }),
    ]);

    return { members, total };
  }
}

export const communityService = new CommunityService();