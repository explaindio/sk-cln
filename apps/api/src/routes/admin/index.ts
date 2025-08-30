// skool-clone/apps/api/src/routes/admin/index.ts
import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin';

// Import sub-route modules
import userRoutes from './users';
import communityRoutes from './communities';
import reportRoutes from './reports';
import healthRoutes from './health';
import featureFlagRoutes from './feature-flags';

const router: Router = Router();

// Apply admin authentication to all admin routes
router.use(requireAdmin);

// Mount sub-routes
router.use('/users', userRoutes);
router.use('/communities', communityRoutes);
router.use('/reports', reportRoutes);
router.use('/health', healthRoutes);
router.use('/feature-flags', featureFlagRoutes);

// Health endpoint for admin route health check
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are operational',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/admin/users',
      '/api/admin/communities',
      '/api/admin/reports',
      '/api/admin/health',
      '/api/admin/feature-flags'
    ]
  });
});

export default router;