import request from 'supertest';
import app from '../../index';
import { prisma } from '../../lib/prisma';

describe('Community API', () => {
  let authToken: string;
  let testUser: any;
  let testCommunity: any;

  beforeAll(async () => {
    // Register and login
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'community@test.com',
        username: 'communitytest',
        password: 'Test123!@#',
      });

    authToken = registerRes.body.accessToken;
    testUser = registerRes.body.user;

    // Create a test community
    const communityRes = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Community',
        slug: 'test-community',
        description: 'Test description',
      });

    testCommunity = communityRes.body.data;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCommunity) {
      await prisma.community.delete({
        where: { id: testCommunity.id },
      });
    }
  });

  describe('Community Settings', () => {
    it('should update community settings', async () => {
      const res = await request(app)
        .patch(`/api/communities/${testCommunity.id}/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Community Name',
          description: 'Updated description',
          isPublic: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Community Name');
      expect(res.body.data.description).toBe('Updated description');
      expect(res.body.data.isPublic).toBe(false);
    });

    it('should reject update from non-member', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nonmember@test.com',
          username: 'nonmember',
          password: 'Test123!@#',
        });

      const nonMemberToken = registerRes.body.accessToken;

      const res = await request(app)
        .patch(`/api/communities/${testCommunity.id}/settings`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({
          name: 'Hacked Name',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Community Membership', () => {
    it('should join a community', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member@test.com',
          username: 'membertest',
          password: 'Test123!@#',
        });

      const memberToken = registerRes.body.accessToken;

      const res = await request(app)
        .post(`/api/members/communities/${testCommunity.id}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.communityId).toBe(testCommunity.id);
      expect(res.body.data.userId).toBe(registerRes.body.user.id);
    });

    it('should not allow joining twice', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member2@test.com',
          username: 'membertest2',
          password: 'Test123!@#',
        });

      const memberToken = registerRes.body.accessToken;

      // Join once
      await request(app)
        .post(`/api/members/communities/${testCommunity.id}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Try to join again
      const res = await request(app)
        .post(`/api/members/communities/${testCommunity.id}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(409);
    });

    it('should leave a community', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'leavemember@test.com',
          username: 'leavemembertest',
          password: 'Test123!@#',
        });

      const memberToken = registerRes.body.accessToken;
      const userId = registerRes.body.user.id;

      // Join community
      await request(app)
        .post(`/api/members/communities/${testCommunity.id}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Leave community
      const res = await request(app)
        .post(`/api/members/communities/${testCommunity.id}/leave`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe(userId);
      expect(res.body.data.communityId).toBe(testCommunity.id);
    });

    it('should not allow owner to leave', async () => {
      const res = await request(app)
        .post(`/api/members/communities/${testCommunity.id}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Community Members', () => {
    it('should get community members', async () => {
      const res = await request(app)
        .get(`/api/communities/${testCommunity.id}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should search community members', async () => {
      const res = await request(app)
        .get(`/api/communities/${testCommunity.id}/members/search?q=${testUser.username}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject member list from non-member', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nonmember2@test.com',
          username: 'nonmember2',
          password: 'Test123!@#',
        });

      const nonMemberToken = registerRes.body.accessToken;

      const res = await request(app)
        .get(`/api/communities/${testCommunity.id}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Member Roles', () => {
    it('should update member role', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'roleuser@test.com',
          username: 'roletest',
          password: 'Test123!@#',
        });

      const memberToken = registerRes.body.accessToken;
      const userId = registerRes.body.user.id;

      // Join community
      await request(app)
        .post(`/api/members/communities/${testCommunity.id}/join`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Update role
      const res = await request(app)
        .patch(`/api/communities/${testCommunity.id}/members/${userId}/role`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'moderator',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('moderator');
    });

    it('should reject role update from non-admin', async () => {
      // Register another user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nonadmin@test.com',
          username: 'nonadmintest',
          password: 'Test123!@#',
        });

      const nonAdminToken = registerRes.body.accessToken;
      const userId = registerRes.body.user.id;

      const res = await request(app)
        .patch(`/api/communities/${testCommunity.id}/members/${userId}/role`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({
          role: 'admin',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Community Invitations', () => {
    it('should return empty invitations list', async () => {
      const res = await request(app)
        .get('/api/members/invitations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return not implemented for accept invitation', async () => {
      const res = await request(app)
        .post('/api/members/invitations/test-invitation-id/accept')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(501);
    });

    it('should return not implemented for decline invitation', async () => {
      const res = await request(app)
        .post('/api/members/invitations/test-invitation-id/decline')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(501);
    });
  });
});