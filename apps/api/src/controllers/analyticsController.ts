// skool-clone/apps/api/src/controllers/analyticsController.ts
import { Request, Response } from 'express';
import { 
  analyticsCollector,
  analyticsAggregator,
  userAnalyticsService,
  contentAnalyticsService,
  revenueAnalyticsService,
  communityAnalyticsService,
  reportingService,
  exportService
} from '@sk-clone/analytics';

export class AnalyticsController {
  /**
   * Get aggregated metrics for a date range
   */
  async getMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      // Validate dates
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Ensure end date is after start date
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
      
      const metrics = await analyticsAggregator.getMetricsSummary(start, end);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Failed to get metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics'
      });
    }
  }

  /**
   * Get detailed analytics for a specific user
   */
  async getUserAnalytics(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const analytics = await userAnalyticsService.getUserAnalytics(userId);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user analytics'
      });
    }
  }

  /**
   * Get analytics for specific content (post/course)
   */
  async getContentAnalytics(req: Request, res: Response) {
    try {
      const { contentId } = req.params;
      const { contentType } = req.query;
      
      // Validate content type
      if (!contentType || !['post', 'course'].includes(contentType as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid content type. Must be "post" or "course"'
        });
      }
      
      const metrics = await contentAnalyticsService.getContentMetrics(
        contentId,
        contentType as 'post' | 'course'
      );
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Failed to get content analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content analytics'
      });
    }
  }

  /**
   * Get trending content
   */
  async getContentTrends(req: Request, res: Response) {
    try {
      const { contentType, days } = req.query;
      
      // Validate content type
      if (!contentType || !['post', 'course'].includes(contentType as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid content type. Must be "post" or "course"'
        });
      }
      
      // Validate days parameter
      const daysNum = days ? parseInt(days as string) : 7;
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        return res.status(400).json({
          success: false,
          error: 'Invalid days parameter. Must be between 1 and 365'
        });
      }
      
      const trends = await contentAnalyticsService.getContentTrends(
        contentType as 'post' | 'course',
        daysNum
      );
      
      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Failed to get content trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content trends'
      });
    }
  }

  /**
   * Get community engagement metrics
   */
  async getCommunityEngagement(req: Request, res: Response) {
    try {
      const { communityId, startDate, endDate } = req.query;
      
      // Validate communityId
      if (!communityId) {
        return res.status(400).json({
          success: false,
          error: 'Community ID is required'
        });
      }
      
      // Validate dates
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Ensure end date is after start date
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
      
      const engagementData = await communityAnalyticsService.getCommunityEngagement(
        communityId as string,
        start,
        end
      );
      
      res.json({
        success: true,
        data: engagementData
      });
    } catch (error) {
      console.error('Failed to get community engagement metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch community engagement metrics'
      });
    }
  }

  /**
   * Get revenue and subscription tracking
   */
  async getRevenueAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      // Validate dates
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Ensure end date is after start date
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
      
      const revenueData = await revenueAnalyticsService.getRevenueData(start, end);
      
      res.json({
        success: true,
        data: revenueData
      });
    } catch (error) {
      console.error('Failed to get revenue analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue analytics'
      });
    }
  }

  /**
   * Create a custom report
   */
  async createCustomReport(req: Request, res: Response) {
    try {
      const { name, filters, metrics } = req.body;
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Report name is required and must be a non-empty string'
        });
      }
      
      if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Metrics array is required and must contain at least one metric'
        });
      }
      
      // Validate metrics are strings
      if (!metrics.every(metric => typeof metric === 'string')) {
        return res.status(400).json({
          success: false,
          error: 'All metrics must be strings'
        });
      }
      
      const report = await reportingService.createCustomReport(
        name.trim(),
        filters || {},
        metrics,
        req.user.id
      );
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Failed to create custom report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create custom report'
      });
    }
  }

  /**
   * Get all custom reports
   */
  async getCustomReports(req: Request, res: Response) {
    try {
      const reports = await reportingService.getCustomReports();
      
      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('Failed to get custom reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch custom reports'
      });
    }
  }

  /**
   * Get a specific custom report
   */
  async getCustomReport(req: Request, res: Response) {
    try {
      const { reportId } = req.params;
      
      const report = await reportingService.getCustomReport(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Failed to get custom report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch custom report'
      });
    }
  }

  /**
   * Export data in various formats
   */
  async exportData(req: Request, res: Response) {
    try {
      const { type, format, startDate, endDate } = req.query;
      
      // Validate required parameters
      if (!type || !['users', 'payments', 'content'].includes(type as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid export type. Must be "users", "payments", or "content"'
        });
      }
      
      if (!format || !['csv', 'json'].includes(format as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid export format. Must be "csv" or "json"'
        });
      }
      
      // Validate dates
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      // Ensure end date is after start date
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
      
      const exportResult = await exportService.exportData(
        type as string,
        format as string,
        start,
        end
      );
      
      // Set headers for download
      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      
      res.send(exportResult.data);
    } catch (error) {
      console.error('Failed to export data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }
}

export const analyticsController = new AnalyticsController();