// skool-clone/apps/api/src/routes/recommendation.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  getRecommendationsSchema,
  feedbackSchema,
  updatePreferencesSchema,
  getPreferencesSchema
} from '../middleware/validation/recommendation';
import {
  getRecommendations,
  submitFeedback,
  getPreferences,
  updatePreferences
} from '../controllers/recommendationController';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/recommendations
 * Get personalized recommendations
 */
router.post(
  '/',
  validateRequest(getRecommendationsSchema),
  getRecommendations
);

/**
 * POST /api/recommendations/feedback
 * Submit recommendation feedback
 */
router.post(
  '/feedback',
  validateRequest(feedbackSchema),
  submitFeedback
);

/**
 * GET /api/recommendations/preferences
 * Get user recommendation preferences
 */
router.get(
  '/preferences',
  validateRequest(getPreferencesSchema),
  getPreferences
);

/**
 * PUT /api/recommendations/preferences
 * Update user preferences
 */
router.put(
  '/preferences',
  validateRequest(updatePreferencesSchema),
  updatePreferences
);

export default router;