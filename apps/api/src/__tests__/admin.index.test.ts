// skool-clone/apps/api/src/__tests__/admin.index.test.ts
import adminRoutes from '../routes/admin/index';
import request from 'supertest';
import express from 'express';

// Create a test app with minimal middleware
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock admin middleware that always passes
  const mockRequireAdmin = (req: any, res: any, next: any) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  };

  // Apply the mock admin middleware globally to all admin routes
  app.use('/admin', (req, res, next) => {
    req.admin = { id: 'admin-123', role: 'ADMIN' };
    next();
  }, adminRoutes);

  return app;
};

describe('Admin Routes', () => {
  const app = createTestApp();

  describe('Middleware and Route Mounting', () => {
    it('should mount admin routes correctly', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Admin routes are operational',
        timestamp: expect.any(String),
        routes: expect.arrayContaining([
          '/api/admin/users',
          '/api/admin/communities',
          '/api/admin/reports',
          '/api/admin/health',
          '/api/admin/feature-flags'
        ])
      });
    });

    it('should handle route structure correctly', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      // Verify the routes array contains all expected admin routes
      expect(response.body.routes).toHaveLength(5);
      expect(response.body.routes).toEqual(expect.arrayContaining([
        '/api/admin/users',
        '/api/admin/communities',
        '/api/admin/reports',
        '/api/admin/health',
        '/api/admin/feature-flags'
      ]));
    });

    it('should include timestamp in response', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Response Format', () => {
    it('should return consistent JSON response format', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('routes');
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.message).toBe('string');
    });

    it('should have proper content type headers', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Route Organization', () => {
    it('should provide clear API documentation in status response', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      const routes = response.body.routes;
      expect(routes).toBeInstanceOf(Array);

      // Check that route paths follow admin naming convention
      routes.forEach((route: string) => {
        expect(route).toMatch(/^\/api\/admin\//);
      });
    });

    it('should list all major admin functionality areas', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      const routes = response.body.routes;

      // Verify we have routes for each major area
      const routeAreas = routes.map((route: string) => route.replace('/api/admin/', '').split('/')[0]);
      expect(routeAreas).toEqual(expect.arrayContaining([
        'users',
        'communities',
        'reports',
        'health',
        'feature-flags'
      ]));
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      // This tests if the middleware and routing can handle malformed requests
      const malformedContent = '{invalid json';

      const response = await request(app)
        .get('/admin/status')
        .set('content-type', 'application/json')
        .send(malformedContent)
        .expect(200); // Should still work for GET requests

      // The status endpoint doesn't use request body, so it should work fine
      expect(response.body.success).toBe(true);
    });

    it('should maintain consistent error response format', async () => {
      // Test with an invalid route to verify error handling structure
      const response = await request(app)
        .get('/admin/nonexistent-route')
        .expect(404);

      // Express default 404 response - this verifies our middleware doesn't interfere
      expect(response.status).toBe(404);
    });
  });

  describe('Scalability and Documentation', () => {
    it('should be easy to add new admin routes', async () => {
      // This test verifies the structure allows easy addition of new routes
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      expect(response.body.routes).toBeInstanceOf(Array);
      expect(response.body.routes.length).toBeGreaterThan(0);

      // Verify routes are properly formatted for API documentation
      response.body.routes.forEach((route: string) => {
        expect(route).toMatch(/^\/api\/admin\//);
        expect(route).toBeDefined();
        expect(route.length).toBeGreaterThan('/api/admin/'.length);
      });
    });

    it('should provide useful debugging information', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      // Verify the response provides useful debug info
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('routes');

      // Verify timestamp is recent
      const responseTime = new Date(response.body.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - responseTime.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });
  });

  describe('Maintenance and Monitoring', () => {
    it('should provide route health check', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify response time is reasonable
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms

      // Verify response contains valid health info
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Admin routes are operational');
    });

    it('should be suitable for load balancer health checks', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(200);

      // Should return 200 and valid JSON for load balancer checks
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});