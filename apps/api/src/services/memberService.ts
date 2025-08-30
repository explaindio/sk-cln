import { prisma } from '../lib/prisma';

export class MemberService {
  async joinCommunity(communityId: string, userId: string) {
    // Check if already member
    const existing = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (existing) {
      throw new Error('Already a member');
    }

    const member = await prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: 'member',
      },
    });

    // Update member count
    await prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } },
    });

    return member;
  }

  async leaveCommunity(communityId: string, userId: string) {
    const member = await prisma.communityMember.delete({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    // Update member count
    await prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { decrement: 1 } },
    });

    return member;
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
      }),
      prisma.communityMember.count({ where: { communityId } }),
    ]);

    return { members, total };
  }

  async getMemberRole(communityId: string, userId: string) {
    const member = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    return member?.role || null;
  }

  async updateMemberRole(communityId: string, userId: string, role: string) {
    // Validate role
    const validRoles = ['member', 'moderator', 'admin', 'owner'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // Check if member exists
    const existing = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!existing) {
      throw new Error('Member not found');
    }

    // Prevent changing owner role
    if (existing.role === 'owner' && role !== 'owner') {
      throw new Error('Cannot change owner role');
    }

    return await prisma.communityMember.update({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      data: { role },
    });
  }

  async isMember(communityId: string, userId: string) {
    const member = await prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    return !!member;
  }

  async getPendingInvitations(userId: string) {
    // This would require an invitation model which doesn't exist in the schema
    // For now, we'll return an empty array
    return [];
  }

  async acceptInvitation(invitationId: string, userId: string) {
    // This would require an invitation model which doesn't exist in the schema
    // For now, we'll throw an error
    throw new Error('Invitation functionality not implemented');
  }

  async declineInvitation(invitationId: string) {
    // This would require an invitation model which doesn't exist in the schema
    // For now, we'll throw an error
    throw new Error('Invitation functionality not implemented');
  }
}

export const memberService = new MemberService();