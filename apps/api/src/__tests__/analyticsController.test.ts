// skool-clone/apps/api/src/__tests__/analyticsController.test.ts
import { Request, Response } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

// Mock the analytics services
jest.mock('@sk-clone/analytics', () => ({
  analyticsCollector: {
    collectUserActivity: jest.fn(),
    collectContentInteraction: jest.fn()
  },
  analyticsAggregator: {
    getMetricsSummary: jest.fn()
  },
  userAnalyticsService: {
    getUserAnalytics: jest.fn()
  },
  contentAnalyticsService: {
    getContentMetrics: jest.fn(),
    getContentTrends: jest.fn()
  },
  revenueAnalyticsService: {
    getRevenueData: jest.fn()
  },
  communityAnalyticsService: {
    getCommunityEngagement: jest.fn()
  },
  reportingService: {
    createCustomReport: jest.fn(),
    getCustomReports: jest.fn(),
    getCustomReport: jest.fn()
  },
  exportService: {
    exportData: jest.fn()
  }
}));

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

const mockAnalyticsAggregator = analyticsAggregator as any;
const mockUserAnalyticsService = userAnalyticsService as any;
const mockContentAnalyticsService = contentAnalyticsService as any;
const mockRevenueAnalyticsService = revenueAnalyticsService as any;
const mockCommunityAnalyticsService = communityAnalyticsService as any;
const mockReportingService = reportingService as any;
const mockExportService = exportService as any;

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    controller = new AnalyticsController();

    mockRequest = {
      user: { id: 'user123' }
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn()
    };

    jsonSpy = mockResponse.json as jest.SpyInstance;
    statusSpy = mockResponse.status as jest.SpyInstance;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return metrics successfully with default dates', async () => {
      const mockMetrics = { users: 100, posts: 50 };
      mockAnalyticsAggregator.getMetricsSummary.mockResolvedValue(mockMetrics);

      mockRequest.query = {};

      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsAggregator.getMetricsSummary).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics
      });
    });

    it('should return metrics successfully with provided dates', async () => {
      const mockMetrics = { users: 100, posts: 50 };
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-01-31T00:00:00.000Z';

      mockAnalyticsAggregator.getMetricsSummary.mockResolvedValue(mockMetrics);
      mockRequest.query = { startDate, endDate };

      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsAggregator.getMetricsSummary).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics
      });
    });

    it('should return error when start date is after end date', async () => {
      mockRequest.query = {
        startDate: '2023-01-31T00:00:00.000Z',
        endDate: '2023-01-01T00:00:00.000Z'
      };

      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'End date must be after start date'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockAnalyticsAggregator.getMetricsSummary.mockRejectedValue(error);

      mockRequest.query = {};

      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch metrics'
      });
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics successfully', async () => {
      const mockAnalytics = { userId: 'user123', totalPosts: 5, engagementRate: 0.75 };
      mockUserAnalyticsService.getUserAnalytics.mockResolvedValue(mockAnalytics);

      mockRequest.params = { userId: 'user123' };

      await controller.getUserAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockUserAnalyticsService.getUserAnalytics).toHaveBeenCalledWith('user123');
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('User not found');
      mockUserAnalyticsService.getUserAnalytics.mockRejectedValue(error);

      mockRequest.params = { userId: 'user123' };

      await controller.getUserAnalytics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch user analytics'
      });
    });
  });

  describe('getContentAnalytics', () => {
    it('should return content analytics successfully for posts', async () => {
      const mockMetrics = { views: 100, likes: 25, comments: 10 };
      mockContentAnalyticsService.getContentMetrics.mockResolvedValue(mockMetrics);

      mockRequest.params = { contentId: 'content123' };
      mockRequest.query = { contentType: 'post' };

      await controller.getContentAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockContentAnalyticsService.getContentMetrics).toHaveBeenCalledWith(
        'content123',
        'post'
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics
      });
    });

    it('should return content analytics successfully for courses', async () => {
      const mockMetrics = { enrollments: 50, completionRate: 0.8 };
      mockContentAnalyticsService.getContentMetrics.mockResolvedValue(mockMetrics);

      mockRequest.params = { contentId: 'course123' };
      mockRequest.query = { contentType: 'course' };

      await controller.getContentAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockContentAnalyticsService.getContentMetrics).toHaveBeenCalledWith(
        'course123',
        'course'
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics
      });
    });

    it('should return error for invalid content type', async () => {
      mockRequest.params = { contentId: 'content123' };
      mockRequest.query = { contentType: 'invalid' };

      await controller.getContentAnalytics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid content type. Must be "post" or "course"'
      });
    });

    it('should return error when content type is missing', async () => {
      mockRequest.params = { contentId: 'content123' };
      mockRequest.query = {};

      await controller.getContentAnalytics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid content type. Must be "post" or "course"'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Content not found');
      mockContentAnalyticsService.getContentMetrics.mockRejectedValue(error);

      mockRequest.params = { contentId: 'content123' };
      mockRequest.query = { contentType: 'post' };

      await controller.getContentAnalytics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch content analytics'
      });
    });
  });

  describe('getContentTrends', () => {
    it('should return content trends successfully with default days', async () => {
      const mockTrends = [
        { contentId: 'post1', trendingScore: 95 },
        { contentId: 'post2', trendingScore: 85 }
      ];
      mockContentAnalyticsService.getContentTrends.mockResolvedValue(mockTrends);

      mockRequest.query = { contentType: 'post' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(mockContentAnalyticsService.getContentTrends).toHaveBeenCalledWith('post', 7);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockTrends
      });
    });

    it('should return content trends successfully with custom days', async () => {
      const mockTrends = [ { contentId: 'post1', trendingScore: 95 } ];
      mockContentAnalyticsService.getContentTrends.mockResolvedValue(mockTrends);

      mockRequest.query = { contentType: 'course', days: '14' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(mockContentAnalyticsService.getContentTrends).toHaveBeenCalledWith('course', 14);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockTrends
      });
    });

    it('should return error for invalid content type', async () => {
      mockRequest.query = { contentType: 'invalid' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid content type. Must be "post" or "course"'
      });
    });

    it('should return error for invalid days parameter', async () => {
      mockRequest.query = { contentType: 'post', days: 'invalid' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid days parameter. Must be between 1 and 365'
      });
    });

    it('should return error for days parameter out of range (too low)', async () => {
      mockRequest.query = { contentType: 'post', days: '0' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid days parameter. Must be between 1 and 365'
      });
    });

    it('should return error for days parameter out of range (too high)', async () => {
      mockRequest.query = { contentType: 'post', days: '400' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid days parameter. Must be between 1 and 365'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service unavailable');
      mockContentAnalyticsService.getContentTrends.mockRejectedValue(error);

      mockRequest.query = { contentType: 'post' };

      await controller.getContentTrends(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch content trends'
      });
    });
  });

  describe('getCommunityEngagement', () => {
    it('should return community engagement successfully', async () => {
      const mockEngagementData = { totalInteractions: 150, activeUsers: 45 };
      mockCommunityAnalyticsService.getCommunityEngagement.mockResolvedValue(mockEngagementData);

      mockRequest.query = {
        communityId: 'community123',
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T00:00:00.000Z'
      };

      await controller.getCommunityEngagement(mockRequest as Request, mockResponse as Response);

      expect(mockCommunityAnalyticsService.getCommunityEngagement).toHaveBeenCalledWith(
        'community123',
        new Date('2023-01-01T00:00:00.000Z'),
        new Date('2023-01-31T00:00:00.000Z')
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockEngagementData
      });
    });

    it('should use default dates when not provided', async () => {
      const mockEngagementData = { totalInteractions: 150, activeUsers: 45 };
      mockCommunityAnalyticsService.getCommunityEngagement.mockResolvedValue(mockEngagementData);

      mockRequest.query = { communityId: 'community123' };

      await controller.getCommunityEngagement(mockRequest as Request, mockResponse as Response);

      expect(mockCommunityAnalyticsService.getCommunityEngagement).toHaveBeenCalledWith(
        'community123',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should return error when communityId is missing', async () => {
      mockRequest.query = { startDate: '2023-01-01T00:00:00.000Z' };

      await controller.getCommunityEngagement(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Community ID is required'
      });
    });

    it('should return error when start date is after end date', async () => {
      mockRequest.query = {
        communityId: 'community123',
        startDate: '2023-01-31T00:00:00.000Z',
        endDate: '2023-01-01T00:00:00.000Z'
      };

      await controller.getCommunityEngagement(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'End date must be after start date'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Community not found');
      mockCommunityAnalyticsService.getCommunityEngagement.mockRejectedValue(error);

      mockRequest.query = { communityId: 'community123' };

      await controller.getCommunityEngagement(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch community engagement metrics'
      });
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics successfully', async () => {
      const mockRevenueData = { totalRevenue: 5000, subscriptions: 100 };
      mockRevenueAnalyticsService.getRevenueData.mockResolvedValue(mockRevenueData);

      mockRequest.query = {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T00:00:00.000Z'
      };

      await controller.getRevenueAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockRevenueAnalyticsService.getRevenueData).toHaveBeenCalledWith(
        new Date('2023-01-01T00:00:00.000Z'),
        new Date('2023-01-31T00:00:00.000Z')
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockRevenueData
      });
    });

    it('should return error when start date is after end date', async () => {
      mockRequest.query = {
        startDate: '2023-01-31T00:00:00.000Z',
        endDate: '2023-01-01T00:00:00.000Z'
      };

      await controller.getRevenueAnalytics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'End date must be after start date'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockRevenueAnalyticsService.getRevenueData.mockRejectedValue(error);

      mockRequest.query = {};

      await controller.getRevenueAnalytics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch revenue analytics'
      });
    });
  });

  describe('createCustomReport', () => {
    it('should create custom report successfully', async () => {
      const mockReport = {
        id: 'report123',
        name: 'Monthly Activity',
        metrics: ['users', 'posts'],
        createdBy: 'user123'
      };
      mockReportingService.createCustomReport.mockResolvedValue(mockReport);

      mockRequest.body = {
        name: 'Monthly Activity',
        metrics: ['users', 'posts']
      };

      await controller.createCustomReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.createCustomReport).toHaveBeenCalledWith(
        'Monthly Activity',
        {},
        ['users', 'posts'],
        'user123'
      );
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return error when name is missing', async () => {
      mockRequest.body = { metrics: ['users', 'posts'] };

      await controller.createCustomReport(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Report name is required and must be a non-empty string'
      });
    });

    it('should return error when metrics is missing', async () => {
      mockRequest.body = { name: 'Monthly Activity' };

      await controller.createCustomReport(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Metrics array is required and must contain at least one metric'
      });
    });

    it('should return error when metrics is empty array', async () => {
      mockRequest.body = { name: 'Monthly Activity', metrics: [] };

      await controller.createCustomReport(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Metrics array is required and must contain at least one metric'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to save report');
      mockReportingService.createCustomReport.mockRejectedValue(error);

      mockRequest.body = {
        name: 'Monthly Activity',
        metrics: ['users', 'posts']
      };

      await controller.createCustomReport(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create custom report'
      });
    });
  });

  describe('getCustomReports', () => {
    it('should return all custom reports successfully', async () => {
      const mockReports = [
        { id: 'report1', name: 'Daily Report' },
        { id: 'report2', name: 'Weekly Report' }
      ];
      mockReportingService.getCustomReports.mockResolvedValue(mockReports);

      await controller.getCustomReports(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.getCustomReports).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockReports
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockReportingService.getCustomReports.mockRejectedValue(error);

      await controller.getCustomReports(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch custom reports'
      });
    });
  });

  describe('getCustomReport', () => {
    it('should return custom report successfully', async () => {
      const mockReport = { id: 'report123', name: 'Monthly Report', data: {} };
      mockReportingService.getCustomReport.mockResolvedValue(mockReport);

      mockRequest.params = { reportId: 'report123' };

      await controller.getCustomReport(mockRequest as Request, mockResponse as Response);

      expect(mockReportingService.getCustomReport).toHaveBeenCalledWith('report123');
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 404 when report is not found', async () => {
      mockReportingService.getCustomReport.mockResolvedValue(null);

      mockRequest.params = { reportId: 'nonexistent' };

      await controller.getCustomReport(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Report not found'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockReportingService.getCustomReport.mockRejectedValue(error);

      mockRequest.params = { reportId: 'report123' };

      await controller.getCustomReport(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch custom report'
      });
    });
  });

  describe('exportData', () => {
    it('should export data successfully', async () => {
      const mockExportResult = {
        data: 'csv data',
        contentType: 'text/csv',
        filename: 'export.csv'
      };
      mockExportService.exportData.mockResolvedValue(mockExportResult);

      mockRequest.query = {
        type: 'users',
        format: 'csv'
      };

      await controller.exportData(mockRequest as Request, mockResponse as Response);

      expect(mockExportService.exportData).toHaveBeenCalledWith(
        'users',
        'csv',
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="export.csv"');
      expect(mockResponse.send).toHaveBeenCalledWith('csv data');
    });

    it('should return error for invalid type', async () => {
      mockRequest.query = { type: 'invalid', format: 'csv' };

      await controller.exportData(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid export type. Must be "users", "payments", or "content"'
      });
    });

    it('should return error for invalid format', async () => {
      mockRequest.query = { type: 'users', format: 'invalid' };

      await controller.exportData(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid export format. Must be "csv" or "json"'
      });
    });

    it('should return error when type is missing', async () => {
      mockRequest.query = { format: 'csv' };

      await controller.exportData(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid export type. Must be "users", "payments", or "content"'
      });
    });

    it('should return error when format is missing', async () => {
      mockRequest.query = { type: 'users' };

      await controller.exportData(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid export format. Must be "csv" or "json"'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Export failed');
      mockExportService.exportData.mockRejectedValue(error);

      mockRequest.query = { type: 'users', format: 'csv' };

      await controller.exportData(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to export data'
      });
    });
  });
});