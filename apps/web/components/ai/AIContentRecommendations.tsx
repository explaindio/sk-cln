'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  TrendingUp, 
  Sparkles, 
  Eye, 
  Heart, 
  MessageSquare, 
  Clock,
  Settings,
  Shield,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';

// Types for our AI recommendation system
interface ContentItem {
  id: string;
  type: 'post' | 'course' | 'event' | 'video';
  title: string;
  description: string;
  thumbnail?: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  tags: string[];
  createdAt: string;
  similarity?: number;
  recommendationReason?: string;
  abTestGroup?: 'A' | 'B';
}

interface UserBehavior {
  contentViews: string[];
  contentLikes: string[];
  contentComments: string[];
  searchQueries: string[];
  timeSpent: Record<string, number>; // contentId -> time in seconds
  categories: string[];
  tags: string[];
}

interface UserPreferences {
  enableAIRecommendations: boolean;
  preferredCategories: string[];
  blockedCategories: string[];
  contentTypes: ('post' | 'course' | 'event' | 'video')[];
  privacyLevel: 'minimal' | 'balanced' | 'full';
}

interface RecommendationEngine {
  recommend: (userId: string, options?: RecommendationOptions) => Promise<ContentItem[]>;
  trackEngagement: (userId: string, contentId: string, action: string) => Promise<void>;
  updatePreferences: (userId: string, preferences: Partial<UserPreferences>) => Promise<void>;
  getRecommendationsWithExplanations: (userId: string) => Promise<RecommendationWithExplanation[]>;
}

interface RecommendationOptions {
  limit?: number;
  categories?: string[];
  excludeIds?: string[];
  minSimilarity?: number;
  includeExplanations?: boolean;
}

interface RecommendationWithExplanation {
  content: ContentItem;
  explanation: {
    type: 'similar_content' | 'trending' | 'user_behavior' | 'collaborative' | 'content_based';
    confidence: number;
    reasoning: string;
    factors: string[];
  };
}


export function AIContentRecommendations() {
  const {
    recommendations,
    isLoading,
    error,
    refresh,
    trackEngagement,
    updatePreferences: hookUpdatePreferences,
  } = useAIRecommendations({
    userId: 'currentUser', // In real app, this would come from auth context
    refreshInterval: 300000, // 5 minutes
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    enableAIRecommendations: true,
    preferredCategories: ['programming', 'webdev'],
    blockedCategories: [],
    contentTypes: ['post', 'course', 'video'],
    privacyLevel: 'balanced'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike'>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleEngagement = async (contentId: string, action: string) => {
    await trackEngagement(contentId, action);
    // Refresh recommendations after engagement
    setTimeout(() => refresh(), 1000);
    setLastRefresh(new Date());
  };

  const handleFeedback = async (contentId: string, type: 'like' | 'dislike') => {
    setFeedback(prev => ({ ...prev, [contentId]: type }));
    await trackEngagement(contentId, type);

    // Update preferences based on feedback for dislikes
    if (type === 'dislike') {
      const content = recommendations.find(r => r.content.id === contentId)?.content;
      if (content) {
        const newBlocked = [...userPreferences.blockedCategories, ...content.tags.filter((tag: string) => !userPreferences.blockedCategories.includes(tag))];
        const newPrefs = { ...userPreferences, blockedCategories: newBlocked };
        setUserPreferences(newPrefs);
        await hookUpdatePreferences({ blockedCategories: newBlocked });
      }
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...userPreferences, ...newPrefs };
    setUserPreferences(updated);
    await hookUpdatePreferences(updated);
    await refresh();
    setLastRefresh(new Date());
  };

  const getContentIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'post': return <MessageSquare className="h-4 w-4" />;
      case 'course': return <Brain className="h-4 w-4" />;
      case 'event': return <Clock className="h-4 w-4" />;
      case 'video': return <Eye className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getExplanationIcon = (type: RecommendationWithExplanation['explanation']['type']) => {
    switch (type) {
      case 'similar_content': return <Sparkles className="h-4 w-4" />;
      case 'trending': return <TrendingUp className="h-4 w-4" />;
      case 'user_behavior': return <Brain className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Recommendations</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refresh}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userPreferences.enableAIRecommendations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Recommendations Disabled</h3>
            <p className="text-gray-600 mb-4">
              Enable AI-powered recommendations to get personalized content suggestions based on your interests and behavior.
            </p>
            <Button onClick={() => updatePreferences({ enableAIRecommendations: true })}>
              Enable Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI-Powered Recommendations</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              BETA
            </span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Last updated: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">AI Recommendation Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={userPreferences.privacyLevel === 'minimal'}
                    onChange={(e) => updatePreferences({ 
                      privacyLevel: e.target.checked ? 'minimal' : 'balanced' 
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Minimal data collection</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Content Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['post', 'course', 'event', 'video'] as const).map(type => (
                    <label key={type} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={userPreferences.contentTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...userPreferences.contentTypes, type]
                            : userPreferences.contentTypes.filter(t => t !== type);
                          updatePreferences({ contentTypes: newTypes });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updatePreferences({ enableAIRecommendations: false })}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Disable AI
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Yet</h3>
            <p className="text-gray-600">
              Start engaging with content to help our AI understand your preferences better.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map(({ content, explanation }) => (
              <div
                key={content.id}
                className="group border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => handleEngagement(content.id, 'view')}
              >
                <div className="flex space-x-3">
                  {content.thumbnail ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={content.thumbnail}
                        alt={content.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                        {getContentIcon(content.type)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getContentIcon(content.type)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                          {content.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {content.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Eye className="h-3 w-3" />
                            <span>{content.engagement.views}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Heart className="h-3 w-3" />
                            <span>{content.engagement.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <MessageSquare className="h-3 w-3" />
                            <span>{content.engagement.comments}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(content.createdAt), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Recommendation Explanation */}
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                            {getExplanationIcon(explanation.type)}
                            <span>{explanation.reasoning}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(explanation.confidence * 100)}% match
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {content.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Feedback Buttons */}
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(content.id, 'like');
                          }}
                          className={`h-6 w-6 p-0 ${
                            feedback[content.id] === 'like' 
                              ? 'text-green-600 bg-green-50' 
                              : 'text-gray-400 hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(content.id, 'dislike');
                          }}
                          className={`h-6 w-6 p-0 ${
                            feedback[content.id] === 'dislike' 
                              ? 'text-red-600 bg-red-50' 
                              : 'text-gray-400 hover:text-red-600'
                          }`}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* A/B Test Indicator */}
        {recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <span>A/B Test Group: {recommendations[0].content.abTestGroup}</span>
                <span>•</span>
                <span>AI Model: v2.1</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Privacy Protected</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}