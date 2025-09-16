import { Request, Response } from 'express';
import { analyticsCollector } from '@sk-clone/analytics';
import { BehavioralEvent } from '@prisma/client';

export class BehavioralAnalyticsController {
  /**
   * POST /api/analytics/behavioral/events/batch
   * Collect batch of behavioral events from frontend
   */
  async batchEvents(req: Request, res: Response): Promise<void> {
    try {
      const { events } = req.body as { events: BehavioralEvent[] };

      if (!events || !Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Events array is required and must not be empty'
        });
        return;
      }

      // Validate each event has required fields
      const validEvents = events.filter(event => 
        event.type && event.sessionId && event.userId && event.timestamp
      );

      if (validEvents.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid events provided'
        });
        return;
      }

      const userId = req.user.id;

      // Apply privacy filters and consent checks
      const filteredEvents = await analyticsCollector.applyPrivacyFilters(userId, validEvents);

      // Store the events using the collector
      await analyticsCollector.collectBehavioralEvents(filteredEvents);

      res.json({
        success: true,
        processed: filteredEvents.length,
        filtered: filteredEvents.length !== validEvents.length
      });
    } catch (error) {
      console.error('Failed to process batch behavioral events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process behavioral events'
      });
    }
  }

  /**
   * GET /api/analytics/behavioral/user/:userId/metrics
   * Get user behavioral metrics (for synchronization)
   */
  async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (userId !== req.user.id && req.user.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized to access this user\'s metrics'
        });
        return;
      }

      // For now, compute metrics from stored events
      // In production, this would use pre-aggregated data
      const events = await analyticsCollector.getUserEvents(userId, 1000);

      // Compute metrics similar to frontend logic
      const engagementScore = events.length > 0 ? events.length * 0.1 : 0; // Simplified

      res.json({
        success: true,
        data: {
          engagementScore,
          eventCount: events.length,
          lastActivity: events[0]?.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to get user behavioral metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user metrics'
      });
    }
  }

  /**
   * POST /api/analytics/behavioral/search
   * Track search queries
   */
  async trackSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query, resultCount, clickedResultId, filters } = req.body;

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query is required'
        });
        return;
      }

      const searchEvent = {
        id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query,
        resultCount: resultCount || 0,
        clickedResultId,
        timestamp: new Date(),
        userId: req.user.id,
        sessionId: req.headers['x-session-id'] as string || 'unknown',
        filters
      };

      await analyticsCollector.collectSearchQueries([searchEvent as any]);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track search query:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track search'
      });
    }
  }

  /**
   * POST /api/analytics/behavioral/time-spent
   * Track time spent on content
   */
  async trackTimeSpent(req: Request, res: Response): Promise<void> {
    try {
      const timeSpentData = req.body as any[];

      if (!Array.isArray(timeSpentData) || timeSpentData.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Time spent data array is required'
        });
        return;
      }

      await analyticsCollector.collectTimeSpent(timeSpentData);

      res.json({ success: true, processed: timeSpentData.length });
    } catch (error) {
      console.error('Failed to track time spent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track time spent'
      });
    }
  }

  /**
   * POST /api/analytics/behavioral/interactions
   * Track user interactions
   */
  async trackInteractions(req: Request, res: Response): Promise<void> {
    try {
      const interactions = req.body as any[];

      if (!Array.isArray(interactions) || interactions.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Interactions array is required'
        });
        return;
      }

      await analyticsCollector.collectInteractions(interactions);

      res.json({ success: true, processed: interactions.length });
    } catch (error) {
      console.error('Failed to track interactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track interactions'
      });
    }
  }
}

export const behavioralAnalyticsController = new BehavioralAnalyticsController();