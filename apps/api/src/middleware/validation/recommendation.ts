// skool-clone/apps/api/src/middleware/validation/recommendation.ts

import Joi from 'joi';

/**
 * POST /api/recommendations
 * Schema for getting personalized recommendations
 * Body is optional, can include filters like limit, types
 */
export const getRecommendationsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  types: Joi.array().items(Joi.string().valid('course', 'post', 'community', 'event', 'user')).optional(),
  excludeIds: Joi.array().items(Joi.string()).optional(),
  category: Joi.string().optional()
});

/**
 * POST /api/recommendations/feedback
 * Schema for submitting feedback
 */
export const feedbackSchema = Joi.object({
  recommendationId: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).optional(),
  helpful: Joi.boolean().optional()
});

/**
 * PUT /api/recommendations/preferences
 * Schema for updating preferences
 */
export const updatePreferencesSchema = Joi.object({
  categories: Joi.array().items(Joi.string()).optional(),
  interests: Joi.array().items(Joi.string()).optional(),
  recommendationFrequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
  optOut: Joi.boolean().optional()
});

/**
 * GET /api/recommendations/preferences
 * No body, but query params if needed (e.g., for future extensions)
 */
export const getPreferencesSchema = Joi.object({
  // Empty for now
});