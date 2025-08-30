// tests/security/security.test.ts
import request from 'supertest';
import { app } from '../../skool-clone/apps/api/src/app';

describe('Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL injection attempts in search', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";

      const response = await request(app)
        .get('/api/search')
        .query({ q: maliciousQuery })
        .expect(200);

      // Should return empty results, not error
      expect(response.body.results).toEqual([]);
    });

    it('should sanitize SQL injection in user input', async () => {
      const maliciousInput = {
        username: "admin'--",
        email: "test@test.com' OR '1'='1",
        password: "'; DELETE FROM users WHERE '1'='1"
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousInput)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize XSS attempts in posts', async () => {
      const xssPayload = {
        title: '<script>alert("XSS")</script>',
        content: '<img src=x onerror="alert(\'XSS\')">'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid_token')
        .send(xssPayload)
        .expect(201);

      // Content should be sanitized
      expect(response.body.title).not.toContain('<script>');
      expect(response.body.content).not.toContain('onerror');
    });

    it('should escape HTML in user profiles', async () => {
      const maliciousProfile = {
        bio: '<script>document.cookie</script>',
        website: 'javascript:alert(1)'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(maliciousProfile)
        .expect(200);

      expect(response.body.bio).not.toContain('<script>');
      expect(response.body.website).not.toContain('javascript:');
    });
  });

  describe('Authentication Security', () => {
    it('should rate limit login attempts', async () => {
      const credentials = {
        email: 'test@test.com',
        password: 'wrong'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(credentials);
      }

      // Should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(429);

      expect(response.body).toHaveProperty('error', 'Too many attempts');
    });

    it('should not leak user existence', async () => {
      const nonExistent = {
        email: 'doesnotexist@test.com',
        password: 'password'
      };

      const wrongPassword = {
        email: 'exists@test.com',
        password: 'wrongpassword'
      };

      const [response1, response2] = await Promise.all([
        request(app).post('/api/auth/login').send(nonExistent),
        request(app).post('/api/auth/login').send(wrongPassword)
      ]);

      // Both should return same error
      expect(response1.body.error).toBe(response2.body.error);
    });

    it('should expire tokens', async () => {
      const expiredToken = 'expired.jwt.token';

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token expired');
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      const userToken = 'regular.user.token';

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Insufficient permissions');
    });

    it('should prevent editing other users content', async () => {
      const userToken = 'user1.token';
      const otherUserPostId = 'post-by-user2';

      const response = await request(app)
        .put(`/api/posts/${otherUserPostId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hacked' })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Not authorized');
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({ title: 'Test', content: 'Test' })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid CSRF token');
    });

    it('should accept valid CSRF token', async () => {
      const csrfToken = await getCSRFToken();

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid_token')
        .set('X-CSRF-Token', csrfToken)
        .send({ title: 'Test', content: 'Test' })
        .expect(201);
    });
  });

  describe('File Upload Security', () => {
    it('should reject dangerous file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer valid_token')
        .attach('file', Buffer.from('malicious'), 'virus.exe')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid file type');
    });

    it('should scan for malware', async () => {
      const eicarTestFile = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer valid_token')
        .attach('file', Buffer.from(eicarTestFile), 'test.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Malware detected');
    });
  });
});

async function getCSRFToken(): Promise<string> {
  const response = await request(app)
    .get('/api/auth/csrf-token')
    .expect(200);

  return response.body.token;
}