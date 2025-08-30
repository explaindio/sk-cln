import { communityService } from '../services/communityService';
import { memberService } from '../services/memberService';
import { prisma } from '../lib/prisma';

describe('Community Service', () => {
  let testUser: any;
 let testCommunity: any;

  beforeAll(async () => {
    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: 'service@test.com',
        username: 'servicetest',
        passwordHash: 'hashedpassword',
      },
    });

    // Create a test community
    testCommunity = await prisma.community.create({
      data: {
        name: 'Test Community',
        slug: 'test-community-service',
        description: 'Test description',
        ownerId: testUser.id,
      },
    });

    // Add user as member
    await prisma.communityMember.create({
      data: {
        communityId: testCommunity.id,
        userId: testUser.id,
        role: 'owner',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testCommunity) {
      await prisma.community.delete({
        where: { id: testCommunity.id },
      });
    }
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
  });

  describe('Community Settings', () => {
    it('should update community settings', async () => {
      const updated = await communityService.updateSettings(testCommunity.id, {
        name: 'Updated Community',
        description: 'Updated description',
        isPublic: false,
      });

      expect(updated.name).toBe('Updated Community');
      expect(updated.description).toBe('Updated description');
      expect(updated.isPublic).toBe(false);
    });
  });

  describe('Community Members', () => {
    it('should get community members', async () => {
      const { members, total } = await communityService.getMembers(testCommunity.id);

      expect(Array.isArray(members)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(1);
    });

    it('should search community members', async () => {
      const { members, total } = await communityService.searchMembers(testCommunity.id, testUser.username);

      expect(Array.isArray(members)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Member Service', () => {
  let testUser: any;
  let testUser2: any;
  let testCommunity: any;

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'member1@test.com',
        username: 'membertest1',
        passwordHash: 'hashedpassword',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'member2@test.com',
        username: 'membertest2',
        passwordHash: 'hashedpassword',
      },
    });

    // Create a test community
    testCommunity = await prisma.community.create({
      data: {
        name: 'Member Test Community',
        slug: 'member-test-community',
        description: 'Test description',
        ownerId: testUser.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testCommunity) {
      await prisma.communityMember.deleteMany({
        where: { communityId: testCommunity.id },
      });
      await prisma.community.delete({
        where: { id: testCommunity.id },
      });
    }
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
    if (testUser2) {
      await prisma.user.delete({
        where: { id: testUser2.id },
      });
    }
  });

  describe('Membership Management', () => {
    it('should join a community', async () => {
      const member = await memberService.joinCommunity(testCommunity.id, testUser2.id);

      expect(member.communityId).toBe(testCommunity.id);
      expect(member.userId).toBe(testUser2.id);
      expect(member.role).toBe('member');
    });

    it('should not allow joining twice', async () => {
      await expect(memberService.joinCommunity(testCommunity.id, testUser2.id))
        .rejects
        .toThrow('Already a member');
    });

    it('should leave a community', async () => {
      const member = await memberService.leaveCommunity(testCommunity.id, testUser2.id);

      expect(member.communityId).toBe(testCommunity.id);
      expect(member.userId).toBe(testUser2.id);
    });

    it('should check if user is member', async () => {
      // Join community
      await memberService.joinCommunity(testCommunity.id, testUser2.id);

      // Check membership
      const isMember = await memberService.isMember(testCommunity.id, testUser2.id);
      expect(isMember).toBe(true);

      // Leave community
      await memberService.leaveCommunity(testCommunity.id, testUser2.id);

      // Check membership again
      const isNotMember = await memberService.isMember(testCommunity.id, testUser2.id);
      expect(isNotMember).toBe(false);
    });
  });

  describe('Member Roles', () => {
    beforeAll(async () => {
      // Join community
      await memberService.joinCommunity(testCommunity.id, testUser2.id);
    });

    afterAll(async () => {
      // Leave community
      await memberService.leaveCommunity(testCommunity.id, testUser2.id);
    });

    it('should update member role', async () => {
      const updated = await memberService.updateMemberRole(testCommunity.id, testUser2.id, 'moderator');

      expect(updated.role).toBe('moderator');
    });

    it('should reject invalid role', async () => {
      await expect(memberService.updateMemberRole(testCommunity.id, testUser2.id, 'invalid'))
        .rejects
        .toThrow('Invalid role');
    });

    it('should get member role', async () => {
      const role = await memberService.getMemberRole(testCommunity.id, testUser2.id);

      expect(role).toBe('moderator');
    });
  });

  describe('Invitations', () => {
    it('should return empty invitations list', async () => {
      const invitations = await memberService.getPendingInvitations(testUser.id);

      expect(Array.isArray(invitations)).toBe(true);
      expect(invitations.length).toBe(0);
    });

    it('should return not implemented for accept invitation', async () => {
      await expect(memberService.acceptInvitation('test-id', testUser.id))
        .rejects
        .toThrow('Invitation functionality not implemented');
    });

    it('should return not implemented for decline invitation', async () => {
      await expect(memberService.declineInvitation('test-id'))
        .rejects
        .toThrow('Invitation functionality not implemented');
    });
  });
});