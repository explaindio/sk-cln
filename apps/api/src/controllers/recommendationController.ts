// skool-clone/apps/api/src/controllers/recommendationController.ts

import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendationService';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Recommendation types
 */
export interface Recommendation {
  id: string;
  type: 'post' | 'course' | 'community' | 'event';
  title: string;
  description?: string;
  thumbnail?: string;
  score: number;
  reason: string;
  url?: string;
}

export interface FeedbackRequest {
  recommendationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  helpful?: boolean;
}

export interface Preferences {
  categories: string[]; // e.g., ['technology', 'education']
  interests: string[]; // e.g., ['AI', 'programming']
  recommendationFrequency: 'daily' | 'weekly' | 'monthly';
  optOut: boolean;
}

/**
 * POST /api/recommendations
 * Get personalized recommendations based on user behavior
 */
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id; // Set by authentication middleware
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Get user preferences to include interests in response
    const preferences = await recommendationService.getUserPreferences(userId);

    // Input validation for limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      throw new AppError('Invalid limit parameter. Must be between 1 and 50.', 400);
    }

    const recommendations = await recommendationService.getPersonalizedRecommendations(userId, limit);

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        personalizedFor: preferences.interests || []
      }
    });
  } catch (error: any) {
    logger.error('Failed to get recommendations', {
      error: error.message,
      userId: (req as any).user?.id,
      stack: error.stack
    });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to generate recommendations' });
    }
  }
};

/**
 * POST /api/recommendations/feedback
 * Submit feedback on a recommendation to improve future suggestions
 */
export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const feedbackData: FeedbackRequest = req.body;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Input validation and sanitization
    if (!feedbackData.recommendationId?.trim() ||
        !feedbackData.rating ||
        (feedbackData.rating < 1 || feedbackData.rating > 5) ||
        (feedbackData.comment && feedbackData.comment.length > 500)) {
      throw new AppError('Invalid feedback data: recommendationId and rating (1-5) are required. Comment max 500 chars.', 400);
    }

    // Sanitize inputs
    const sanitizedFeedback = {
      ...feedbackData,
      recommendationId: feedbackData.recommendationId.trim(),
      comment: feedbackData.comment?.trim()
    };

    await recommendationService.submitFeedback(userId, sanitizedFeedback);

    res.status(201).json({
      success: true,
      data: { message: 'Feedback submitted successfully' }
    });
  } catch (error: any) {
    logger.error('Failed to submit feedback', {
      error: error.message,
      userId: (req as any).user?.id,
      feedbackData: req.body,
      stack: error.stack
    });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to submit feedback' });
    }
  }
};

/**
 * GET /api/recommendations/preferences
 * Get user's recommendation preferences
 */
export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const preferences = await recommendationService.getUserPreferences(userId);

    // Ensure response matches expected interface
    const responseData = {
      categories: preferences.categories || [],
      interests: preferences.interests || [],
      recommendationFrequency: preferences.recommendationFrequency || 'weekly',
      optOut: preferences.optOut || false
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error: any) {
    logger.error('Failed to get preferences', {
      error: error.message,
      userId: (req as any).user?.id,
      stack: error.stack
    });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
    }
  }
};

/**
 * PUT /api/recommendations/preferences
 * Update user's recommendation preferences
 */
export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const preferencesData = req.body;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    // Input validation and sanitization
    if (Object.keys(preferencesData).length === 0) {
      throw new AppError('No preferences data provided', 400);
    }

    // Sanitize arrays
    const sanitizedData = {
      ...preferencesData,
      categories: preferencesData.categories?.map((cat: string) => cat.trim())?.filter(Boolean) || [],
      interests: preferencesData.interests?.map((interest: string) => interest.trim())?.filter(Boolean) || []
    };

    // Basic length validation (service has more, but add here too)
    if (sanitizedData.categories?.length > 10) {
      throw new AppError('Too many categories selected (max 10)', 400);
    }
    if (sanitizedData.interests?.length > 20) {
      throw new AppError('Too many interests selected (max 20)', 400);
    }

    await recommendationService.updateUserPreferences(userId, sanitizedData);

    // Return updated preferences
    const updatedPrefs = await recommendationService.getUserPreferences(userId);

    res.status(200).json({
      success: true,
      data: {
        message: 'Preferences updated successfully',
        preferences: {
          categories: updatedPrefs.categories || [],
          interests: updatedPrefs.interests || [],
          recommendationFrequency: updatedPrefs.recommendationFrequency || 'weekly',
          optOut: updatedPrefs.optOut || false
        }
      }
    });
  } catch (error: any) {
    logger.error('Failed to update preferences', {
      error: error.message,
      userId: (req as any).user?.id,
      preferencesData: req.body,
      stack: error.stack
    });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update preferences' });
    }
  }
};

// No helper functions needed; using recommendationService