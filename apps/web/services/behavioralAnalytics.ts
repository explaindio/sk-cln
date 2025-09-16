'use client';

import { UserBehavior, ContentItem } from '@/components/ai';
import { api } from '../lib/api';
import { offlineQueue } from './offlineQueue';

export interface BehavioralEvent {
  id?: string;
  type: 'view' | 'like' | 'comment' | 'share' | 'search' | 'time_spent' | 'scroll' | 'click';
  contentId?: string;
  contentType?: 'post' | 'course' | 'event' | 'video';
  metadata?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId: string;
}

export interface BehavioralMetrics {
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

class BehavioralAnalyticsService {
  private static instance: BehavioralAnalyticsService;
  private events: BehavioralEvent[] = [];
  private sessionId: string;
  private userId: string;
  private isTrackingEnabled: boolean = true;
  private batchSize: number = 50;
  private flushInterval: number = 30000; // 30 seconds

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getCurrentUserId();
    this.initializeTracking();
  }

  static getInstance(): BehavioralAnalyticsService {
    if (!BehavioralAnalyticsService.instance) {
      BehavioralAnalyticsService.instance = new BehavioralAnalyticsService();
    }
    return BehavioralAnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    // In a real app, this would come from authentication context
    return 'currentUser';
  }

  private initializeTracking() {
    // Set up periodic flushing of events
    setInterval(() => {
      this.flushEvents();
      this.syncOfflineQueue();
    }, this.flushInterval);

    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushEvents();
        } else {
          // Try to sync offline queue when page becomes visible
          this.syncOfflineQueue();
        }
      });
    }

    // Track beforeunload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEvents();
      });

      // Sync offline queue when coming back online
      window.addEventListener('online', () => {
        this.syncOfflineQueue();
      });
    }

    // Initial sync of offline queue
    this.syncOfflineQueue();
  }

  private async syncOfflineQueue(): Promise<void> {
    try {
      const pendingEvents = await offlineQueue.getPendingEvents(50);
      
      if (pendingEvents.length === 0) return;

      console.log(`Attempting to sync ${pendingEvents.length} offline events`);

      const events = pendingEvents.map(queued => queued.data);
      
      const response = await api.post('/api/analytics/behavioral/events/batch', {
        events: events
      });

      if (response.data.success) {
        // Remove successfully synced events
        for (const queuedEvent of pendingEvents) {
          await offlineQueue.removeEvent(queuedEvent.id);
        }
        
        console.log(`Successfully synced ${pendingEvents.length} offline events`);
      }
    } catch (error) {
      console.error('Failed to sync offline events:', error);
      
      // Increment retry count for failed events
      const pendingEvents = await offlineQueue.getPendingEvents(10);
      for (const event of pendingEvents) {
        if (event.retryCount < 3) {
          await offlineQueue.incrementRetryCount(event.id);
        } else {
          // Remove events that have failed too many times
          await offlineQueue.removeEvent(event.id);
          console.warn(`Removed event after ${event.retryCount} retries:`, event);
        }
      }
    }
  }

  enableTracking(): void {
    this.isTrackingEnabled = true;
  }

  disableTracking(): void {
    this.isTrackingEnabled = false;
    this.flushEvents();
  }

  private validateEvent(event: Partial<BehavioralEvent>): boolean {
    if (!this.isTrackingEnabled) return false;
    if (!event.type || !event.userId || !event.timestamp) return false;
    if (event.userId !== this.userId) return false;
    return true;
  }

  trackEvent(event: Omit<BehavioralEvent, 'sessionId' | 'userId' | 'timestamp'>): void {
    if (!this.isTrackingEnabled) return;

    const fullEvent: BehavioralEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    if (!this.validateEvent(fullEvent)) return;

    this.events.push(fullEvent);

    // Flush if batch size is reached
    if (this.events.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  trackContentView(contentId: string, contentType: ContentItem['type'], metadata?: Record<string, any>): void {
    this.trackEvent({
      type: 'view',
      contentId,
      contentType,
      metadata: {
        ...metadata,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      },
    });
  }

  trackContentLike(contentId: string, contentType: ContentItem['type'], isLiked: boolean): void {
    this.trackEvent({
      type: 'like',
      contentId,
      contentType,
      metadata: { action: isLiked ? 'like' : 'unlike' },
    });
  }

  trackContentComment(contentId: string, contentType: ContentItem['type'], commentLength: number): void {
    this.trackEvent({
      type: 'comment',
      contentId,
      contentType,
      metadata: { commentLength },
    });
  }

  trackContentShare(contentId: string, contentType: ContentItem['type'], platform?: string): void {
    this.trackEvent({
      type: 'share',
      contentId,
      contentType,
      metadata: { platform },
    });
  }

  trackSearch(query: string, resultCount?: number, clickedResultId?: string): void {
    this.trackEvent({
      type: 'search',
      metadata: {
        query,
        queryLength: query.length,
        resultCount,
        clickedResultId,
        hasFilters: query.includes('tag:') || query.includes('category:'),
      },
    });
  }

  trackTimeSpent(contentId: string, contentType: ContentItem['type'], timeSpent: number, metadata?: Record<string, any>): void {
    // Only track meaningful time spent (more than 5 seconds)
    if (timeSpent < 5000) return;

    this.trackEvent({
      type: 'time_spent',
      contentId,
      contentType,
      metadata: {
        timeSpent,
        scrollDepth: metadata?.scrollDepth || 0,
        readProgress: metadata?.readProgress || 0,
        isCompleted: metadata?.isCompleted || false,
      },
    });
  }

  trackScroll(contentId: string, scrollDepth: number, contentHeight: number): void {
    this.trackEvent({
      type: 'scroll',
      contentId,
      metadata: {
        scrollDepth,
        contentHeight,
        scrollPercentage: (scrollDepth / contentHeight) * 100,
      },
    });
  }

  trackClick(elementId: string, elementType: string, metadata?: Record<string, any>): void {
    this.trackEvent({
      type: 'click',
      metadata: {
        elementId,
        elementType,
        ...metadata,
      },
    });
  }

  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      // Send to backend API
      const response = await api.post('/api/analytics/behavioral/events/batch', {
        events: eventsToFlush
      });

      if (response.data.success) {
        console.log(`Successfully sent ${eventsToFlush.length} behavioral events to backend`);
        
        // Emit custom event for other components to listen to
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('behavioralAnalyticsFlush', {
            detail: { events: eventsToFlush.length },
          }));
        }
      } else {
        throw new Error('Backend rejected events');
      }
    } catch (error) {
      console.error('Failed to flush behavioral events to backend:', error);
      
      // Store events in offline queue for retry
      for (const event of eventsToFlush) {
        await offlineQueue.addEvent(event);
      }
      
      // Put events back in memory queue for immediate retry
      this.events.unshift(...eventsToFlush);
      
      // Store in localStorage for persistence
      this.storeEventsForRetry(eventsToFlush);
    }
  }

  private storeEventsForRetry(events: BehavioralEvent[]): void {
    // Store events in localStorage for retry persistence
    if (typeof localStorage !== 'undefined') {
      const storedEvents = this.getStoredEvents();
      const updatedEvents = [...storedEvents, ...events];
      
      // Keep only last 1000 events to prevent storage bloat
      const trimmedEvents = updatedEvents.slice(-1000);
      
      localStorage.setItem('behavioral_events', JSON.stringify(trimmedEvents));
    }

    // Update user behavior profile
    this.updateUserBehaviorProfile(events);
  }

  private async processEventsLocally(events: BehavioralEvent[]): Promise<void> {
    // Store events in localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      const storedEvents = this.getStoredEvents();
      const updatedEvents = [...storedEvents, ...events];
      
      // Keep only last 1000 events to prevent storage bloat
      const trimmedEvents = updatedEvents.slice(-1000);
      
      localStorage.setItem('behavioral_events', JSON.stringify(trimmedEvents));
    }

    // Update user behavior profile
    this.updateUserBehaviorProfile(events);
  }

  private getStoredEvents(): BehavioralEvent[] {
    if (typeof localStorage === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('behavioral_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse stored events:', error);
      return [];
    }
  }

  private updateUserBehaviorProfile(events: BehavioralEvent[]): void {
    const behavior = this.getUserBehavior();
    
    events.forEach(event => {
      switch (event.type) {
        case 'view':
          if (event.contentId && !behavior.contentViews.includes(event.contentId)) {
            behavior.contentViews.push(event.contentId);
          }
          break;
        case 'like':
          if (event.contentId && !behavior.contentLikes.includes(event.contentId)) {
            behavior.contentLikes.push(event.contentId);
          }
          break;
        case 'comment':
          if (event.contentId && !behavior.contentComments.includes(event.contentId)) {
            behavior.contentComments.push(event.contentId);
          }
          break;
        case 'search':
          if (event.metadata?.query) {
            behavior.searchQueries.push(event.metadata.query);
          }
          break;
        case 'time_spent':
          if (event.contentId && event.metadata?.timeSpent) {
            behavior.timeSpent[event.contentId] = (behavior.timeSpent[event.contentId] || 0) + event.metadata.timeSpent;
          }
          break;
      }

      // Update categories and tags based on content type
      if (event.contentType) {
        const category = this.getCategoryFromContentType(event.contentType);
        if (category && !behavior.categories.includes(category)) {
          behavior.categories.push(category);
        }
      }

      if (event.metadata?.tags) {
        event.metadata.tags.forEach((tag: string) => {
          if (!behavior.tags.includes(tag)) {
            behavior.tags.push(tag);
          }
        });
      }
    });

    this.storeUserBehavior(behavior);
  }

  private getCategoryFromContentType(contentType: string): string {
    const categoryMap: Record<string, string> = {
      'post': 'general',
      'course': 'education',
      'event': 'events',
      'video': 'media',
    };
    return categoryMap[contentType] || 'general';
  }

  private getUserBehavior(): UserBehavior {
    if (typeof localStorage === 'undefined') {
      return this.createDefaultBehavior();
    }

    try {
      const stored = localStorage.getItem('user_behavior');
      return stored ? JSON.parse(stored) : this.createDefaultBehavior();
    } catch (error) {
      console.error('Failed to parse user behavior:', error);
      return this.createDefaultBehavior();
    }
  }

  private createDefaultBehavior(): UserBehavior {
    return {
      contentViews: [],
      contentLikes: [],
      contentComments: [],
      searchQueries: [],
      timeSpent: {},
      categories: [],
      tags: [],
    };
  }

  private storeUserBehavior(behavior: UserBehavior): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem('user_behavior', JSON.stringify(behavior));
    } catch (error) {
      console.error('Failed to store user behavior:', error);
    }
  }

  getUserBehaviorMetrics(): BehavioralMetrics {
    const behavior = this.getUserBehavior();
    const events = this.getStoredEvents();

    return {
      engagementScore: this.calculateEngagementScore(behavior, events),
      interestVector: this.calculateInterestVector(behavior, events),
      activityPatterns: this.calculateActivityPatterns(events),
      recommendationAccuracy: this.calculateRecommendationAccuracy(events),
    };
  }

  private calculateEngagementScore(behavior: UserBehavior, events: BehavioralEvent[]): number {
    const totalViews = behavior.contentViews.length;
    const totalLikes = behavior.contentLikes.length;
    const totalComments = behavior.contentComments.length;
    const totalTimeSpent = Object.values(behavior.timeSpent).reduce((sum, time) => (sum as number) + (time as number), 0) as number;

    // Normalize scores (0-100)
    const viewScore = Math.min(totalViews * 2, 30);
    const likeScore = Math.min(totalLikes * 5, 25);
    const commentScore = Math.min(totalComments * 10, 25);
    const timeScore = Math.min(totalTimeSpent / 60000, 20); // 20 points max for 20 minutes

    return Math.round(viewScore + likeScore + commentScore + timeScore);
  }

  private calculateInterestVector(behavior: UserBehavior, events: BehavioralEvent[]): Record<string, number> {
    const vector: Record<string, number> = {};

    // Count tag interactions
    behavior.tags.forEach((tag: string) => {
      vector[tag] = (vector[tag] || 0) + 1;
    });

    // Count category interactions
    behavior.categories.forEach((category: string) => {
      vector[category] = (vector[category] || 0) + 2;
    });

    // Count search queries
    behavior.searchQueries.forEach((query: string) => {
      const words = query.toLowerCase().split(' ');
      words.forEach((word: string) => {
        if (word.length > 2) {
          vector[word] = (vector[word] || 0) + 3;
        }
      });
    });

    // Normalize to 0-100 scale
    const maxValue = Math.max(...Object.values(vector), 1);
    Object.keys(vector).forEach(key => {
      vector[key] = Math.round((vector[key] / maxValue) * 100);
    });

    return vector;
  }

  private calculateActivityPatterns(events: BehavioralEvent[]): BehavioralMetrics['activityPatterns'] {
    const hours = new Array(24).fill(0);
    const contentTypes: Record<string, number> = {};
    const tagPreferences: Record<string, number> = {};

    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hours[hour]++;

      if (event.contentType) {
        contentTypes[event.contentType] = (contentTypes[event.contentType] || 0) + 1;
      }

      if (event.metadata?.tags) {
        event.metadata.tags.forEach((tag: string) => {
          tagPreferences[tag] = (tagPreferences[tag] || 0) + 1;
        });
      }
    });

    // Get most active hours (top 3)
    const mostActiveHours = hours
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    return {
      mostActiveHours,
      contentTypePreferences: contentTypes,
      tagPreferences,
    };
  }

  private calculateRecommendationAccuracy(events: BehavioralEvent[]): BehavioralMetrics['recommendationAccuracy'] {
    const recommendationEvents = events.filter(e => e.metadata?.isRecommendation);
    const clickedRecommendations = recommendationEvents.filter(e => e.type === 'view');
    const likedRecommendations = recommendationEvents.filter(e => e.type === 'like');

    const totalRecommendations = recommendationEvents.length;
    const clickThroughRate = totalRecommendations > 0 ? (clickedRecommendations.length / totalRecommendations) * 100 : 0;
    const likeRate = clickedRecommendations.length > 0 ? (likedRecommendations.length / clickedRecommendations.length) * 100 : 0;

    // Calculate time spent rate (average time spent on recommended content vs general content)
    const recommendedTimeSpent = events
      .filter(e => e.type === 'time_spent' && e.metadata?.isRecommendation)
      .reduce((sum, e) => sum + (e.metadata?.timeSpent || 0), 0);

    const generalTimeSpent = events
      .filter(e => e.type === 'time_spent' && !e.metadata?.isRecommendation)
      .reduce((sum, e) => sum + (e.metadata?.timeSpent || 0), 0);

    const recommendedCount = events.filter(e => e.type === 'time_spent' && e.metadata?.isRecommendation).length;
    const generalCount = events.filter(e => e.type === 'time_spent' && !e.metadata?.isRecommendation).length;

    const avgRecommendedTime = recommendedCount > 0 ? recommendedTimeSpent / recommendedCount : 0;
    const avgGeneralTime = generalCount > 0 ? generalTimeSpent / generalCount : 0;

    const timeSpentRate = avgGeneralTime > 0 ? (avgRecommendedTime / avgGeneralTime) * 100 : 0;

    return {
      clickThroughRate: Math.round(clickThroughRate),
      likeRate: Math.round(likeRate),
      timeSpentRate: Math.round(timeSpentRate),
    };
  }

  clearUserData(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem('behavioral_events');
      localStorage.removeItem('user_behavior');
      this.events = [];
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  exportUserData(): string {
    const data = {
      events: this.getStoredEvents(),
      behavior: this.getUserBehavior(),
      metrics: this.getUserBehaviorMetrics(),
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
}

// Export singleton instance
export const behavioralAnalytics = BehavioralAnalyticsService.getInstance();

// Export types
export type { BehavioralEvent as BehavioralEventType, BehavioralMetrics as BehavioralMetricsType };