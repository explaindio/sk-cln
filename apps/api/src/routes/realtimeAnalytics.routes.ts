// skool-clone/apps/api/src/routes/realtimeAnalytics.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  subscribeToRealtimeSchema,
  unsubscribeFromRealtimeSchema,
  startRealtimeUpdatesSchema
} from '../middleware/validation/analytics';
import { realtimeAnalyticsController } from '../controllers/realtimeAnalyticsController';

const router = Router();

// All real-time analytics routes require authentication
router.use(authenticate);

/**
 * POST /api/analytics/realtime/subscribe
 * Subscribe to real-time analytics updates
 */
router.post('/subscribe', 
  validateRequest(subscribeToRealtimeSchema),
  realtimeAnalyticsController.subscribeToRealtime
);

/**
 * POST /api/analytics/realtime/unsubscribe
 * Unsubscribe from real-time analytics updates
 */
router.post('/unsubscribe', 
  validateRequest(unsubscribeFromRealtimeSchema),
  realtimeAnalyticsController.unsubscribeFromRealtime
);

/**
 * GET /api/analytics/realtime/dashboard/:dashboardId
 * Get initial dashboard data
 */
router.get('/dashboard/:dashboardId',
  (req, res, next) => {
    // Validate dashboardId parameter
    const { dashboardId } = req.params;
    if (!dashboardId || typeof dashboardId !== 'string' || dashboardId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Dashboard ID is required and must be a non-empty string'
      });
    }
    next();
  },
  realtimeAnalyticsController.getDashboardData
);

/**
 * POST /api/analytics/realtime/start
 * Start real-time analytics updates (admin only)
 */
router.post('/start',
  authorize(['ADMIN']),
  validateRequest(startRealtimeUpdatesSchema),
  realtimeAnalyticsController.startRealtimeUpdates
);

/**
 * POST /api/analytics/realtime/stop
 * Stop real-time analytics updates (admin only)
 */
router.post('/stop',
  authorize(['ADMIN']),
  realtimeAnalyticsController.stopRealtimeUpdates
);

export default router;