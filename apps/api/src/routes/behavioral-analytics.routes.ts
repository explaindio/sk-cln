import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { behavioralAnalyticsController } from '../controllers/behavioralAnalyticsController';

const router = Router();

// All behavioral analytics routes require authentication
router.use(authenticate);

/**
 * POST /api/analytics/behavioral/events/batch
 * Collect batch of behavioral events
 */
router.post('/events/batch', behavioralAnalyticsController.batchEvents);

/**
 * GET /api/analytics/behavioral/user/:userId/metrics
 * Get user behavioral metrics
 */
router.get('/user/:userId/metrics', behavioralAnalyticsController.getUserMetrics);

/**
 * POST /api/analytics/behavioral/search
 * Track search queries
 */
router.post('/search', behavioralAnalyticsController.trackSearch);

/**
 * POST /api/analytics/behavioral/time-spent
 * Track time spent on content
 */
router.post('/time-spent', behavioralAnalyticsController.trackTimeSpent);

/**
 * POST /api/analytics/behavioral/interactions
 * Track user interactions
 */
router.post('/interactions', behavioralAnalyticsController.trackInteractions);

export default router;