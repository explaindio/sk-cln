import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { searchAnalyticsService } from './searchAnalytics.service';
import { postService } from './postService';
import { courseService } from './courseService';
import { reactionService } from './reactionService';
import { memberService } from './memberService';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errors';
import { REACTION_TYPES } from './reactionService';

// Types
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

export interface UserPreferenceUpdate {
  categories?: string[];
  interests?: string[];
  recommendationFrequency?: 'daily' | 'weekly' | 'monthly' | 'never';
  optOut?: boolean;
}

export interface FeedbackData {
  recommendationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  helpful?: boolean;
}

export interface SimilarityInput {
  content1: { tags?: string[]; categories?: string[]; description?: string };
  content2: { tags?: string[]; categories?: string[]; description?: string };
}

// Simple caching using Map (in production, use Redis)
const cache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class RecommendationService {
  // 1. Get personalized recommendations
  async getPersonalizedRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
    try {
      // Check privacy and consent
      const preferences = await this.getUserPreferences(userId);
      if (preferences.optOut) {
        logger.info(`User ${userId} has opted out of recommendations`);
        return [];
      }

      const cacheKey = `recommendations:${userId}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }

      // Get user behavior data
      await this.trackUserBehavior(userId, 'recommendation_request');

      // Collaborative filtering: Find similar users based on interactions
      const similarUsers = await this.getSimilarUsers(userId, 5);

      // Content-based filtering: Based on user's interests and past interactions
      const userInteractions = await this.getUserInteractions(userId);
      const contentRecommendations = await this.getContentBasedRecommendations(userId, userInteractions, preferences);

      // Combine and rank recommendations
      let recommendations: Recommendation[] = [];

      // Posts recommendations
      const postRecs = await this.getPostRecommendations(userId, similarUsers, preferences, limit / 3);
      recommendations.push(...postRecs);

      // Course recommendations
      const courseRecs = await this.getCourseRecommendations(userId, userInteractions, preferences, limit / 3);
      recommendations.push(...courseRecs);

      // Community recommendations
      const communityRecs = await this.getCommunityRecommendations(userId, similarUsers, limit / 3);
      recommendations.push(...communityRecs);

      // Sort by score and limit
      recommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      cache.set(cacheKey, { data: recommendations, timestamp: Date.now() });

      logger.info(`Generated ${recommendations.length} recommendations for user ${userId}`);
      return recommendations;
    } catch (error) {
      logger.error(`Error generating recommendations for user ${userId}:`, error);
      throw new BadRequestError('Failed to generate recommendations');
    }
  }

  // 2. Submit feedback
  async submitFeedback(userId: string, feedback: FeedbackData): Promise<void> {
    try {
      // Validate user consent
      const preferences = await this.getUserPreferences(userId);
      if (preferences.optOut) {
        throw new UnauthorizedError('User has opted out of feedback collection');
      }

      await prisma.recommendationFeedback.create({
        data: {
          userId,
          recommendationId: feedback.recommendationId,
          rating: feedback.rating,
          comment: feedback.comment,
          helpful: feedback.helpful,
        },
      });

      // Log for analytics
      await this.trackUserBehavior(userId, 'feedback_submitted', { rating: feedback.rating });

      logger.info(`Feedback submitted by user ${userId} for recommendation ${feedback.recommendationId}`);
    } catch (error) {
      logger.error(`Error submitting feedback for user ${userId}:`, error);
      throw new BadRequestError('Failed to submit feedback');
    }
  }

  // 3. Get user preferences
  async getUserPreferences(userId: string) {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Create default preferences
        const defaultPrefs = await prisma.userPreferences.create({
          data: {
            userId,
            categories: [],
            interests: [],
            recommendationFrequency: 'weekly',
            optOut: false,
          },
        });
        return defaultPrefs;
      }

      return preferences;
    } catch (error) {
      logger.error(`Error retrieving preferences for user ${userId}:`, error);
      throw new NotFoundError('User preferences not found');
    }
  }

  // 4. Update user preferences
  async updateUserPreferences(userId: string, updates: UserPreferenceUpdate): Promise<void> {
    try {
      // Validation
      if (updates.categories && updates.categories.length > 10) {
        throw new BadRequestError('Too many categories selected');
      }
      if (updates.interests && updates.interests.length > 20) {
        throw new BadRequestError('Too many interests selected');
      }
      if (updates.recommendationFrequency && !['daily', 'weekly', 'monthly', 'never'].includes(updates.recommendationFrequency)) {
        throw new BadRequestError('Invalid recommendation frequency');
      }

      await prisma.userPreferences.upsert({
        where: { userId },
        update: updates,
        create: {
          userId,
          ...updates,
          categories: updates.categories || [],
          interests: updates.interests || [],
          recommendationFrequency: updates.recommendationFrequency || 'weekly',
          optOut: updates.optOut || false,
        },
      });

      // Invalidate cache
      cache.delete(`recommendations:${userId}`);
      cache.delete(`preferences:${userId}`);

      logger.info(`Preferences updated for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating preferences for user ${userId}:`, error);
      throw error;
    }
  }

  // 5. Calculate similarity
  calculateSimilarity(input: SimilarityInput): number {
    try {
      const { content1, content2 } = input;

      // Simple tag-based similarity (Jaccard similarity)
      const tags1 = content1.tags || [];
      const tags2 = content2.tags || [];
      const categories1 = content1.categories || [];
      const categories2 = content2.categories || [];

      const allTags = [...new Set([...tags1, ...tags2])];
      const allCategories = [...new Set([...categories1, ...categories2])];

      const tagIntersection = tags1.filter(tag => tags2.includes(tag)).length;
      const categoryIntersection = categories1.filter(cat => categories2.includes(cat)).length;

      const tagUnion = allTags.length;
      const categoryUnion = allCategories.length;

      const tagSimilarity = tagUnion > 0 ? tagIntersection / tagUnion : 0;
      const categorySimilarity = categoryUnion > 0 ? categoryIntersection / categoryUnion : 0;

      // Weighted average
      return (tagSimilarity * 0.6 + categorySimilarity * 0.4);
    } catch (error) {
      logger.error('Error calculating similarity:', error);
      return 0;
    }
  }

  // 6. Track user behavior
  async trackUserBehavior(userId: string, action: string, metadata?: any): Promise<void> {
    try {
      // Integrate with searchAnalyticsService for logging
      await searchAnalyticsService.logSearch({
        userId,
        query: action, // Use action as query for tracking
        filters: metadata,
        page: 1,
        resultsCount: 0,
        took: 0,
      });

      // Additional logging for recommendations
      logger.info(`Tracked behavior for user ${userId}: ${action}`, metadata);
    } catch (error) {
      logger.error(`Error tracking behavior for user ${userId}:`, error);
      // Don't throw, as tracking is non-critical
    }
  }

  // Helper: Get similar users based on interactions (simple collaborative filtering)
  private async getSimilarUsers(userId: string, limit: number): Promise<string[]> {
    try {
      // Get user's interacted posts and courses
      const userPosts = await prisma.reaction.findMany({
        where: { userId },
        select: { postId: true },
      });
      const userCourses = await prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true },
      });

      const userInteractions = [
        ...userPosts.map(p => `post:${p.postId}`),
        ...userCourses.map(c => `course:${c.courseId}`),
      ];

      // Find other users with similar interactions
      const similarUsers: string[] = [];
      // Simple implementation: Find users who interacted with same items
      // In production, use matrix factorization or ML model

      const otherUsers = await prisma.user.findMany({
        where: { id: { not: userId } },
        take: limit * 10, // Sample
      });

      for (const otherUser of otherUsers) {
        const otherInteractions = await prisma.$queryRaw`
          SELECT 'post' as type, r.post_id as id FROM reactions r WHERE r.user_id = ${otherUser.id}
          UNION
          SELECT 'course' as type, e.course_id as id FROM enrollments e WHERE e.user_id = ${otherUser.id}
        `;

        const overlap = otherInteractions.filter((interaction: any) => 
          userInteractions.includes(`${interaction.type}:${interaction.id}`)
        ).length;

        if (overlap > 2) { // Threshold
          similarUsers.push(otherUser.id);
          if (similarUsers.length >= limit) break;
        }
      }

      return similarUsers;
    } catch (error) {
      logger.error(`Error getting similar users for ${userId}:`, error);
      return [];
    }
  }

  // Helper: Get user interactions
  private async getUserInteractions(userId: string) {
    const [reactions, enrollments, searches] = await Promise.all([
      prisma.reaction.findMany({ where: { userId }, select: { postId: true, type: true } }),
      prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
      prisma.searchQuery.findMany({ where: { userId }, select: { query: true } }),
    ]);

    return {
      likedPosts: reactions.filter(r => r.type === REACTION_TYPES.LIKE).map(r => r.postId),
      enrolledCourses: enrollments.map(e => e.courseId),
      searchTerms: searches.map(s => s.query),
    };
  }

  // Helper: Content-based post recommendations
  private async getPostRecommendations(
    userId: string,
    similarUsers: string[],
    preferences: any,
    limit: number
  ): Promise<Recommendation[]> {
    const posts = await postService.listByCommunity(preferences.categories?.[0] || '', 1, limit * 2).then(r => r.posts);

    return posts.slice(0, limit).map(post => ({
      id: post.id,
      type: 'post' as const,
      title: post.title,
      description: post.content.substring(0, 100),
      thumbnail: post.attachments?.[0],
      score: Math.random() * 0.8 + 0.2, // Placeholder; use similarity
      reason: 'Based on your interests',
      url: `/posts/${post.id}`,
    }));
  }

  // Helper: Content-based course recommendations
  private async getCourseRecommendations(
    userId: string,
    interactions: any,
    preferences: any,
    limit: number
  ): Promise<Recommendation[]> {
    const courses = await courseService.getCourses({
      tags: preferences.interests,
      limit: limit * 2,
    });

    return courses.slice(0, limit).map(course => ({
      id: course.id,
      type: 'course' as const,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      score: this.calculateSimilarity({
        content1: { tags: preferences.interests, categories: preferences.categories },
        content2: { tags: course.tags, categories: [course.difficulty] },
      }),
      reason: 'Matches your learning interests',
      url: `/courses/${course.id}`,
    }));
  }

  // Helper: Community recommendations
  private async getCommunityRecommendations(
    userId: string,
    similarUsers: string[],
    limit: number
  ): Promise<Recommendation[]> {
    const communities = await prisma.community.findMany({
      take: limit,
      include: { categories: true },
    });

    return communities.map(community => ({
      id: community.id,
      type: 'community' as const,
      title: community.name,
      description: community.description,
      thumbnail: community.logoUrl,
      score: Math.random() * 0.8 + 0.2, // Placeholder
      reason: 'Popular among similar users',
      url: `/communities/${community.slug}`,
    }));
  }

  // Helper: Get content-based recommendations
  private async getContentBasedRecommendations(
    userId: string,
    interactions: any,
    preferences: any
  ): Promise<Recommendation[]> {
    // Implementation using similarity on interests and past interactions
    // Placeholder for now
    return [];
  }
}

export const recommendationService = new RecommendationService();