// skool-clone/apps/api/src/routes/analytics.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  getMetricsSchema,
  getContentMetricsSchema,
 getUserAnalyticsSchema,
 exportDataSchema,
  customReportSchema,
  communityEngagementSchema,
  revenueTrackingSchema,
  contentTrendsSchema,
  subscribeToRealtimeSchema,
  unsubscribeFromRealtimeSchema,
  startRealtimeUpdatesSchema
} from '../middleware/validation/analytics';
import { analyticsController } from '../controllers/analyticsController';
import realtimeAnalyticsRoutes from './realtimeAnalytics.routes';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * GET /api/analytics/metrics
 * Get aggregated metrics for a date range
 */
router.get('/metrics', 
  authorize(['ADMIN']), 
  validateRequest(getMetricsSchema),
  analyticsController.getMetrics
);

/**
 * GET /api/analytics/users/:userId
 * Get detailed analytics for a specific user
 */
router.get('/users/:userId',
  authorize(['ADMIN']),
  validateRequest(getUserAnalyticsSchema),
  analyticsController.getUserAnalytics
);

/**
 * GET /api/analytics/content/:contentId
 * Get analytics for specific content (post/course)
 */
router.get('/content/:contentId',
  authorize(['ADMIN']),
  validateRequest(getContentMetricsSchema),
  analyticsController.getContentAnalytics
);

/**
 * GET /api/analytics/content/trends
 * Get trending content
 */
router.get('/content/trends',
  authorize(['ADMIN']),
  validateRequest(contentTrendsSchema),
  analyticsController.getContentTrends
);

/**
 * GET /api/analytics/engagement/community
 * Get community engagement metrics
 */
router.get('/engagement/community',
  authorize(['ADMIN']),
  validateRequest(communityEngagementSchema),
  analyticsController.getCommunityEngagement
);

/**
 * GET /api/analytics/revenue
 * Get revenue and subscription tracking
 */
router.get('/revenue',
  authorize(['ADMIN']),
  validateRequest(revenueTrackingSchema),
  analyticsController.getRevenueAnalytics
);

/**
 * POST /api/analytics/reports/custom
 * Create a custom report
 */
router.post('/reports/custom',
  authorize(['ADMIN']),
  validateRequest(customReportSchema),
  analyticsController.createCustomReport
);

/**
 * GET /api/analytics/reports/custom
 * Get all custom reports
 */
router.get('/reports/custom',
  authorize(['ADMIN']),
  analyticsController.getCustomReports
);

/**
 * GET /api/analytics/reports/custom/:reportId
 * Get a specific custom report
 */
router.get('/reports/custom/:reportId',
  authorize(['ADMIN']),
  analyticsController.getCustomReport
);

/**
 * GET /api/analytics/export
 * Export data in various formats
 */
router.get('/export',
  authorize(['ADMIN']),
  validateRequest(exportDataSchema),
  analyticsController.exportData
);

// Mount real-time analytics routes
router.use('/realtime', realtimeAnalyticsRoutes);

export default router;