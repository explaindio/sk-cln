'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash'; // Add if not installed: npm i lodash @types/lodash
import { 
  AIContentRecommendations, 
  ContentItem, 
  UserPreferences,
  RecommendationOptions,
  RecommendationWithExplanation 
} from '@/components/ai';
import { behavioralAnalytics } from '@/services/behavioralAnalytics';
import { contentSimilarityAnalyzer } from '@/services/contentSimilarity';

export interface UseAIRecommendationsOptions {
  userId?: string;
  limit?: number;
  categories?: string[];
  excludeIds?: string[];
  minSimilarity?: number;
  includeExplanations?: boolean;
  enableTracking?: boolean;
  refreshInterval?: number;
  onRecommendationClick?: (content: ContentItem) => void;
  onRecommendationEngagement?: (content: ContentItem, action: string) => void;
}

export interface UseAIRecommendationsReturn {
  recommendations: RecommendationWithExplanation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  trackEngagement: (contentId: string, action: string) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  getSimilarContent: (contentId: string) => Promise<ContentItem[]>;
  getBehavioralMetrics: () => BehavioralMetrics;
  clearUserData: () => void;
  exportUserData: () => string;
}

interface BehavioralMetrics {
  engagementScore: number;
  interestVector: Record<string, number>;
  activityPatterns: {
    mostActiveHours: number[];
    contentTypePreferences: Record<string, number>;
    tagPreferences: Record<string, number>;
  };
  recommendationAccuracy: {
    clickThroughRate: number;
    likeRate: number;
    timeSpentRate: number;
  };
}

  // API types based on backend
  interface BackendRecommendation {
    id: string;
    type: 'post' | 'course' | 'community' | 'event';
    title: string;
    description?: string;
    thumbnail?: string;
    score: number;
    reason: string;
    url?: string;
  }

  interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }

  interface BackendPreferences {
    categories: string[];
    interests: string[];
    recommendationFrequency: 'daily' | 'weekly' | 'monthly';
    optOut: boolean;
  }

  interface FeedbackRequest {
    recommendationId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    helpful?: boolean;
  }

  // Transform backend recommendation to frontend ContentItem and RecommendationWithExplanation
  function transformToRecommendation(rec: BackendRecommendation, userPreferences: string[]): RecommendationWithExplanation {
    // Map backend type to frontend (add 'video' mapping if needed)
    const contentType = rec.type as ContentItem['type'];

    // Create basic ContentItem - enrich with defaults/placeholders since backend is minimal
    const contentItem: ContentItem = {
      id: rec.id,
      type: contentType,
      title: rec.title,
      description: rec.description || '',
      author: { id: 'unknown', username: 'Community', avatar: '/default-avatar.jpg' }, // Fetch real author if needed
      engagement: { views: 0, likes: 0, comments: 0, shares: 0 }, // Fetch real engagement if needed
      tags: userPreferences, // Use user interests as proxy for tags
      createdAt: new Date().toISOString(), // Backend doesn't provide, use current or fetch
      thumbnail: rec.thumbnail || undefined,
      similarity: rec.score,
      recommendationReason: rec.reason,
      abTestGroup: Math.random() > 0.5 ? 'A' : 'B',
    };

    // Generate explanation from backend data
    const explanationType: RecommendationWithExplanation['explanation']['type'] =
      rec.score > 0.7 ? 'user_behavior' :
      rec.score > 0.5 ? 'trending' : 'content_based';

    const explanation: RecommendationWithExplanation['explanation'] = {
      type: explanationType,
      confidence: Math.min(rec.score, 1.0),
      reasoning: rec.reason || 'Recommended based on your activity',
      factors: [rec.reason || 'Personalized matching'],
    };

    return {
      content: contentItem,
      explanation,
    };
  }

  // API service
  class AIRecommendationApiService {
    private baseUrl = '/api';
    private cache = new Map<string, { data: any; timestamp: number }>();
    private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private getAuthHeaders(): HeadersInit {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null; // Assume token in localStorage
      return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
    }

    private async fetchWithCache<T>(key: string, fetchFn: () => Promise<T>, useCache = true): Promise<T> {
      if (useCache) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          return cached.data;
        }
      }

      try {
        const data = await fetchFn();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        // Fallback to cache if offline or error
        const cached = this.cache.get(key);
        if (cached) return cached.data;
        throw error;
      }
    }

    private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline - using cached data if available');
      }

      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    }

    async getRecommendations(
      userId: string,
      options: RecommendationOptions = {},
      enableTracking = true
    ): Promise<RecommendationWithExplanation[]> {
      const params = new URLSearchParams({
        limit: (options.limit || 5).toString(),
        ...(options.categories?.length && { categories: options.categories.join(',') }),
        ...(options.excludeIds?.length && { excludeIds: options.excludeIds.join(',') }),
        ...(options.minSimilarity && { minSimilarity: options.minSimilarity.toString() }),
      });

      const key = `recommendations:${userId}:${params.toString()}`;
      const fetchFn = () => this.apiCall<BackendRecommendation[]>(`/recommendations?${params}`);

      const apiResponse = await this.fetchWithCache(key, fetchFn);

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error('Failed to fetch recommendations');
      }

      // Get preferences for transformation
      const prefsResponse = await this.getPreferences(userId);
      const userPreferences = prefsResponse.data?.personalizedFor || [];

      const recommendations = apiResponse.data.map(rec => transformToRecommendation(rec, userPreferences));

      // Track if enabled
      if (enableTracking) {
        recommendations.forEach(rec => {
          behavioralAnalytics.trackEvent({
            type: 'view',
            contentId: rec.content.id,
            contentType: rec.content.type,
            metadata: {
              isRecommendation: true,
              recommendationScore: rec.content.similarity,
              explanationType: rec.explanation.type,
              abTestGroup: rec.content.abTestGroup,
            },
          });
        });
      }

      return recommendations;
    }

    async submitFeedback(userId: string, feedback: FeedbackRequest): Promise<void> {
      const response = await this.apiCall(`/recommendations/feedback`, {
        method: 'POST',
        body: JSON.stringify(feedback),
      });

      if (!response.success) {
        throw new Error('Failed to submit feedback');
      }

      // Track client-side
      behavioralAnalytics.trackEvent({
        type: 'click',
        contentId: feedback.recommendationId,
        metadata: { rating: feedback.rating, helpful: feedback.helpful },
      });
    }

    async getPreferences(userId: string): Promise<{ data: BackendPreferences }> {
      const key = `preferences:${userId}`;
      const fetchFn = () => this.apiCall<BackendPreferences>(`/recommendations/preferences`);

      const response = await this.fetchWithCache(key, fetchFn);
      if (!response.success) throw new Error('Failed to fetch preferences');

      return { data: response.data! };
    }

    async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<BackendPreferences> {
      // Map frontend UserPreferences to backend
      const backendPrefs: Partial<BackendPreferences> = {
        categories: preferences.categories as string[] || [],
        interests: preferences.interests as string[] || [],
        recommendationFrequency: preferences.recommendationFrequency as any || 'weekly',
        optOut: preferences.optOut || false,
      };

      const response = await this.apiCall<BackendPreferences>(`/recommendations/preferences`, {
        method: 'PUT',
        body: JSON.stringify(backendPrefs),
      });

      if (!response.success) throw new Error('Failed to update preferences');

      // Invalidate cache
      this.cache.delete(`recommendations:${userId}`);
      this.cache.delete(`preferences:${userId}`);

      // Track
      behavioralAnalytics.trackEvent({
        type: 'click',
        metadata: backendPrefs,
      });

      return response.data!;
    }

    async getSimilarContent(contentId: string): Promise<ContentItem[]> {
      // No backend endpoint, fallback to client-side similarity
      // For now, return empty or implement client fetch (e.g., search API)
      console.warn('getSimilarContent not implemented in backend, using client-side fallback');
      return []; // Or integrate with search service if available
    }

    getBehavioralMetrics(): BehavioralMetrics {
      return behavioralAnalytics.getUserBehaviorMetrics();
    }

    clearUserData(): void {
      behavioralAnalytics.clearUserData();
      // Clear caches
      this.cache.clear();
      localStorage.removeItem(`user_behavior_${userId}`); // Assuming userId available
    }

    exportUserData(): string {
      return behavioralAnalytics.exportUserData();
    }
  }

  // Singleton instance
  const recommendationApi = new AIRecommendationApiService();

// Create singleton instance
const recommendationEngine = new AIRecommendationEngineWithAnalytics();

export function useAIRecommendations(options: UseAIRecommendationsOptions = {}): UseAIRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<RecommendationWithExplanation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const userId = options.userId || 'currentUser';
  const enableTracking = options.enableTracking ?? true;
  const refreshInterval = options.refreshInterval ?? 300000; // 5 minutes default

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const recs = await recommendationEngine.getRecommendations(userId, {
        limit: options.limit,
        categories: options.categories,
        excludeIds: options.excludeIds,
        minSimilarity: options.minSimilarity,
        includeExplanations: options.includeExplanations,
      }, enableTracking);

      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enableTracking, options.limit, options.categories, options.excludeIds, options.minSimilarity, options.includeExplanations]);

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchRecommendations();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchRecommendations, refreshInterval]);

  const trackEngagement = useCallback(async (contentId: string, action: string) => {
    try {
      await recommendationEngine.trackEngagement(userId, contentId, action);
      
      // Call user-provided callback if available
      const content = recommendations.find(r => r.content.id === contentId)?.content;
      if (content && options.onRecommendationEngagement) {
        options.onRecommendationEngagement(content, action);
      }
    } catch (err) {
      console.error('Error tracking engagement:', err);
    }
  }, [userId, recommendations, options.onRecommendationEngagement]);

  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    try {
      await recommendationEngine.updatePreferences(userId, preferences);
      // Refresh recommendations after updating preferences
      await fetchRecommendations();
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  }, [userId, fetchRecommendations]);

  const getSimilarContent = useCallback(async (contentId: string) => {
    try {
      return await recommendationEngine.getSimilarContent(contentId);
    } catch (err) {
      console.error('Error getting similar content:', err);
      return [];
    }
  }, []);

  const getBehavioralMetrics = useCallback(() => {
    return recommendationEngine.getBehavioralMetrics();
  }, []);

  const clearUserData = useCallback(() => {
    recommendationEngine.clearUserData();
  }, []);

  const exportUserData = useCallback(() => {
    return recommendationEngine.exportUserData();
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    refresh: fetchRecommendations,
    trackEngagement,
    updatePreferences,
    getSimilarContent,
    getBehavioralMetrics,
    clearUserData,
    exportUserData,
  };
}

// Export types
export type { UseAIRecommendationsOptions, UseAIRecommendationsReturn };