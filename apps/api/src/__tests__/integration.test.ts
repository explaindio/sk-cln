import request from 'supertest';
import app from '../index';

describe('Core API Integration', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Register and login
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'integration@test.com',
        username: 'integrationtest',
        password: 'Test123!@#',
      });

    authToken = registerRes.body.accessToken;
    testUser = registerRes.body.user;
  });

  describe('Communities', () => {
    it('should create a community', async () => {
      const res = await request(app)
        .post('/api/communities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Community',
          slug: 'test-community-integration',
          description: 'Test description',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Community');
    });

    it('should list communities', async () => {
      const res = await request(app)
        .get('/api/communities');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  // Additional tests are in separate files:
  // - community.test.ts for community-specific tests
});