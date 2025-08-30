import { Request, Response } from 'express';
import { moderationController } from '../controllers/moderationController';
import { prisma } from '../lib/prisma';
import { moderationService } from '../services/moderationService';
import { reportManagementService } from '../../packages/moderation/src/services/reportManagement';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  prisma: {
    post: {
      update: jest.fn(),
    },
    comment: {
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    moderationLog: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../services/moderationService', () => ({
  moderationService: {
    getModerationDashboard: jest.fn(),
    checkContentFilters: jest.fn(),
    processContentAutoModeration: jest.fn(),
    moderateContent: jest.fn(),
    bulkModerateContent: jest.fn(),
    getModerationStats: jest.fn(),
    getContentFilters: jest.fn(),
    createContentFilter: jest.fn(),
    updateContentFilter: jest.fn(),
    deleteContentFilter: jest.fn(),
  },
}));

jest.mock('../../packages/moderation/src/services/reportManagement', () => ({
  reportManagementService: {
    createReport: jest.fn(),
    getPendingReports: jest.fn(),
    reviewReport: jest.fn(),
    getReportStatistics: jest.fn(),
  },
}));

describe('ModerationController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonSpy,
      status: statusSpy,
      send: jest.fn(),
    };

    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: {},
    };

    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return moderation dashboard data successfully', async () => {
      const mockDashboard = {
        pendingReports: 25,
        activeModerators: 5,
        totalModActions: 150,
        recentActivities: [
          {
            id: '1',
            action: 'BAN',
            moderator: 'mod1',
            createdAt: new Date(),
          },
        ],
      };

      (moderationService.getModerationDashboard as jest.Mock).mockResolvedValue(mockDashboard);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getDashboard(adminRequest, mockResponse as Response);

      expect(moderationService.getModerationDashboard).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockDashboard });
    });

    it('should handle database connection errors', async () => {
      const error = new Error('Database connection error');
      (error as any).code = 'P1001';
      (moderationService.getModerationDashboard as jest.Mock).mockRejectedValue(error);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getDashboard(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Database connection error',
      });
    });

    it('should handle permission errors', async () => {
      const error = new Error('Insufficient permissions');
      (error as any).message = 'permission';
      (moderationService.getModerationDashboard as jest.Mock).mockRejectedValue(error);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getDashboard(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
      });
    });
  });

  describe('checkContent', () => {
    it('should check content filters successfully', async () => {
      const mockResult = {
        safe: true,
        matchedFilters: [],
        score: 0.1,
        recommendation: 'allow',
      };

      (moderationService.checkContentFilters as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = { content: 'This is a test post content' };
      const authRequest = mockRequest as any;
      authRequest.user = { id: 'user1' };

      await moderationController.checkContent(authRequest, mockResponse as Response);

      expect(moderationService.checkContentFilters).toHaveBeenCalledWith('This is a test post content');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult });
    });

    it('should handle long content error', async () => {
      const error = new Error('Content exceeds maximum allowed length');
      (error as any).message = 'content too long';
      (moderationService.checkContentFilters as jest.Mock).mockRejectedValue(error);

      mockRequest.body = { content: 'x'.repeat(10000) };
      const authRequest = mockRequest as any;
      authRequest.user = { id: 'user1' };

      await moderationController.checkContent(authRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Content exceeds maximum allowed length',
      });
    });
  });

  describe('autoModerationCheck', () => {
    it('should process auto-moderation successfully', async () => {
      const mockResult = {
        flagged: false,
        score: 0.2,
        categories: [],
        action: 'allow',
        metadata: {
          processed: true,
          timestamp: new Date(),
        },
      };

      (moderationService.processContentAutoModeration as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        content: 'Test content',
        contentType: 'post',
        metadata: { source: 'web' },
      };
      const authRequest = mockRequest as any;
      authRequest.user = { id: 'user1' };

      await moderationController.autoModerationCheck(authRequest, mockResponse as Response);

      expect(moderationService.processContentAutoModeration).toHaveBeenCalledWith(
        'Test content',
        'post',
        'user1',
        { source: 'web' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult });
    });
  });

  describe('moderateContent', () => {
    it('should moderate content successfully', async () => {
      const mockResult = {
        success: true,
        actionTaken: 'HIDDEN',
        targetId: 'post1',
        targetType: 'post',
        reason: 'Spam content',
      };

      (moderationService.moderateContent as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        targetId: 'post1',
        targetType: 'post',
        action: 'HIDE',
        reason: 'Contains spam',
        notes: 'Automated detection',
        duration: '7 days',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.moderateContent(adminRequest, mockResponse as Response);

      expect(moderationService.moderateContent).toHaveBeenCalledWith(
        'post1',
        'post',
        'admin-id',
        {
          action: 'HIDE',
          reason: 'Contains spam',
          notes: 'Automated detection',
          duration: '7 days',
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult });
    });

    it('should return 404 if target not found', async () => {
      const error = new Error('Post not found');
      (error as any).message = 'not found';
      (moderationService.moderateContent as jest.Mock).mockRejectedValue(error);

      mockRequest.body = {
        targetId: 'non-existent',
        targetType: 'post',
        action: 'BAN',
        reason: 'Violation',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.moderateContent(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Post not found',
      });
    });
  });

  describe('bulkModerate', () => {
    it('should bulk moderate content successfully', async () => {
      const mockResult = {
        total: 3,
        successful: 3,
        failed: 0,
        results: [],
        succeeded: ['post1', 'post2', 'comment1'],
        failed: [],
      };

      (moderationService.bulkModerateContent as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        targetIds: ['post1', 'post2', 'comment1'],
        targetType: 'content',
        action: 'HIDE',
        reason: 'Bulk moderation',
        notes: 'Daily cleanup',
        duration: 'permanent',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.bulkModerate(adminRequest, mockResponse as Response);

      expect(moderationService.bulkModerateContent).toHaveBeenCalledWith(
        'admin-id',
        {
          targetIds: ['post1', 'post2', 'comment1'],
          targetType: 'content',
          action: 'HIDE',
          reason: 'Bulk moderation',
          notes: 'Daily cleanup',
          duration: 'permanent',
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult });
    });

    it('should return 207 for partial failures', async () => {
      const mockResult = {
        total: 3,
        successful: 2,
        failed: 1,
        results: [],
        succeeded: ['post1', 'post2'],
        failed: ['post3'],
      };

      (moderationService.bulkModerateContent as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        targetIds: ['post1', 'post2', 'post3'],
        targetType: 'post',
        action: 'DELETE',
        reason: 'Spam cleanup',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.bulkModerate(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(207);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockResult,
          message: 'Bulk moderation completed with 1 failures',
        }),
      });
    });
  });

  describe('getStats', () => {
    it('should return moderation stats successfully', async () => {
      const mockStats = {
        totalModActions: 150,
        actionsThisMonth: 45,
        topCategories: [
          { category: 'SPAM', count: 60 },
          { category: 'HARASSMENT', count: 30 },
        ],
        responseTime: {
          average: 45, // minutes
          median: 30,
        },
        moderatorStats: [
          { moderatorId: 'mod1', actions: 42, avgTime: 25 },
        ],
      };

      (moderationService.getModerationStats as jest.Mock).mockResolvedValue(mockStats);

      mockRequest.query = { timeframe: 'month' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getStats(adminRequest, mockResponse as Response);

      expect(moderationService.getModerationStats).toHaveBeenCalledWith('month');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockStats });
    });
  });

  describe('getContentFilters', () => {
    it('should return content filters successfully', async () => {
      const mockFilters = [
        {
          id: '1',
          name: 'Spam Filter',
          type: 'REGEX',
          pattern: 'spam keywords',
          severity: 'MEDIUM',
          action: 'WARN',
          isActive: true,
        },
        {
          id: '2',
          name: 'Harassment Filter',
          type: 'KEYWORD',
          pattern: 'bad words',
          severity: 'HIGH',
          action: 'HIDE',
          isActive: true,
        },
      ];

      (moderationService.getContentFilters as jest.Mock).mockResolvedValue(mockFilters);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getContentFilters(adminRequest, mockResponse as Response);

      expect(moderationService.getContentFilters).toHaveBeenCalledWith(false);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockFilters });
    });

    it('should filter by active status', async () => {
      const mockActiveFilters = [
        {
          id: '1',
          name: 'Active Filter',
          isActive: true,
        },
      ];

      (moderationService.getContentFilters as jest.Mock).mockResolvedValue(mockActiveFilters);

      mockRequest.query = { activeOnly: 'true' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getContentFilters(adminRequest, mockResponse as Response);

      expect(moderationService.getContentFilters).toHaveBeenCalledWith(true);
    });
  });

  describe('createContentFilter', () => {
    it('should create content filter successfully', async () => {
      const mockFilter = {
        id: '1',
        name: 'New Spam Filter',
        type: 'REGEX',
        pattern: 'spammy.*words',
        severity: 'MEDIUM',
        action: 'WARN',
        isActive: true,
        createdBy: 'admin-id',
        createdAt: new Date(),
      };

      (moderationService.createContentFilter as jest.Mock).mockResolvedValue(mockFilter);

      mockRequest.body = {
        name: 'New Spam Filter',
        type: 'REGEX',
        pattern: 'spammy.*words',
        severity: 'MEDIUM',
        action: 'WARN',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.createContentFilter(adminRequest, mockResponse as Response);

      expect(moderationService.createContentFilter).toHaveBeenCalledWith({
        name: 'New Spam Filter',
        type: 'REGEX',
        pattern: 'spammy.*words',
        severity: 'MEDIUM',
        action: 'WARN',
        createdBy: 'admin-id',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockFilter });
    });

    it('should handle duplicate filter name', async () => {
      const error = new Error('Filter with this name already exists');
      (moderationService.createContentFilter as jest.Mock).mockRejectedValue(error);

      mockRequest.body = {
        name: 'Existing Filter',
        type: 'KEYWORD',
        pattern: 'spam',
        severity: 'LOW',
        action: 'ALLOW',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.createContentFilter(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Content filter with this name already exists',
      });
    });
  });

  describe('updateContentFilter', () => {
    it('should update content filter successfully', async () => {
      const mockUpdatedFilter = {
        id: '1',
        name: 'Updated Spam Filter',
        type: 'REGEX',
        pattern: 'updated.*pattern',
        severity: 'HIGH',
        action: 'HIDE',
        isActive: true,
        updatedAt: new Date(),
      };

      (moderationService.updateContentFilter as jest.Mock).mockResolvedValue(mockUpdatedFilter);

      mockRequest.params = { id: '1' };
      mockRequest.body = {
        name: 'Updated Spam Filter',
        type: 'REGEX',
        pattern: 'updated.*pattern',
        severity: 'HIGH',
        action: 'HIDE',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.updateContentFilter(adminRequest, mockResponse as Response);

      expect(moderationService.updateContentFilter).toHaveBeenCalledWith('1', {
        name: 'Updated Spam Filter',
        type: 'REGEX',
        pattern: 'updated.*pattern',
        severity: 'HIGH',
        action: 'HIDE',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockUpdatedFilter });
    });

    it('should return 400 if filter ID is missing', async () => {
      mockRequest.params = {};

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.updateContentFilter(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Filter ID is required',
      });
    });
  });

  describe('deleteContentFilter', () => {
    it('should delete content filter successfully', async () => {
      (moderationService.deleteContentFilter as jest.Mock).mockResolvedValue({});

      mockRequest.params = { id: '1' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.deleteContentFilter(adminRequest, mockResponse as Response);

      expect(moderationService.deleteContentFilter).toHaveBeenCalledWith('1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'Content filter deleted successfully' },
      });
    });
  });

  describe('createReport', () => {
    it('should create report successfully', async () => {
      const mockReport = {
        id: '1',
        reporterId: 'user1',
        targetType: 'post',
        targetId: 'post1',
        reason: 'Spam content',
        description: 'This post contains spam',
        status: 'PENDING',
        createdAt: new Date(),
      };

      (reportManagementService.createReport as jest.Mock).mockResolvedValue(mockReport);

      mockRequest.body = {
        targetType: 'post',
        targetId: 'post1',
        reason: 'Spam',
        description: 'This post contains spam content',
      };

      const authRequest = mockRequest as any;
      authRequest.user = { id: 'user1' };

      await moderationController.createReport(authRequest, mockResponse as Response);

      expect(reportManagementService.createReport).toHaveBeenCalledWith({
        reporterId: 'user1',
        targetType: 'post',
        targetId: 'post1',
        reason: 'Spam',
        description: 'This post contains spam content',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockReport });
    });

    it('should handle rate limit exceeded', async () => {
      const error = new Error('Rate limit exceeded');
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (reportManagementService.createReport as jest.Mock).mockRejectedValue(error);

      mockRequest.body = {
        targetType: 'comment',
        targetId: 'comment1',
        reason: 'Harassment',
      };

      const authRequest = mockRequest as any;
      authRequest.user = { id: 'user1' };

      await moderationController.createReport(authRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Report rate limit exceeded, please try again later',
      });
    });
  });

  describe('getReports', () => {
    it('should return pending reports successfully', async () => {
      const mockReports = [
        {
          id: '1',
          targetType: 'post',
          targetId: 'post1',
          reason: 'Spam',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      (reportManagementService.getPendingReports as jest.Mock).mockResolvedValue(mockReports);
      (prisma.report.count as jest.Mock).mockResolvedValue(1);

      mockRequest.query = {
        status: 'pending',
        targetType: 'post',
        severity: 'high',
        limit: '10',
        offset: '0',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getReports(adminRequest, mockResponse as Response);

      expect(reportManagementService.getPendingReports).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        severity: 'high',
        targetType: 'post',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: mockReports,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('reviewReport', () => {
    it('should review report successfully', async () => {
      const mockResult = {
        report: {
          id: '1',
          targetType: 'post',
          targetId: 'post1',
        },
        message: 'Report approved and action taken',
      };

      (reportManagementService.reviewReport as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { id: '1' };
      mockRequest.body = {
        decision: 'approve',
        resolution: 'Content moderated',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.reviewReport(adminRequest, mockResponse as Response);

      expect(reportManagementService.reviewReport).toHaveBeenCalledWith(
        '1',
        'admin-id',
        'approve',
        'Content moderated'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          ...mockResult,
          message: 'Report approved successfully',
        },
      });
    });
  });

  describe('getReportStats', () => {
    it('should return report statistics successfully', async () => {
      const mockStats = {
        totalReports: 100,
        pendingReports: 25,
        resolvedReports: 75,
        averageResolutionTime: 8.5,
        reportsByStatus: { PENDING: 25, RESOLVED: 75 },
        reportsByTargetType: { post: 60, comment: 30, user: 10 },
        reportsBySeverity: { low: 20, medium: 30, high: 50 },
        recentActivity: [
          { date: '2023-08-01', reports: 10 },
          { date: '2023-08-02', reports: 8 },
        ],
      };

      (reportManagementService.getReportStatistics as jest.Mock).mockResolvedValue(mockStats);

      mockRequest.query = { timeframe: 'week' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await moderationController.getReportStats(adminRequest, mockResponse as Response);

      expect(reportManagementService.getReportStatistics).toHaveBeenCalledWith('week');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockStats });
    });
  });
});