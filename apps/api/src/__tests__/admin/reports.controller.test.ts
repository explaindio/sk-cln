import { Request, Response } from 'express';
import { reportManagementController } from '../../controllers/admin/reportManagementController';
import { prisma } from '../../lib/prisma';
import { reportManagementService } from '../../../packages/moderation/src/services/reportManagement';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    report: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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

jest.mock('../../../packages/moderation/src/services/reportManagement', () => ({
  reportManagementService: {
    getPendingReports: jest.fn(),
    reviewReport: jest.fn(),
    getReportStatistics: jest.fn(),
  },
}));

describe('ReportManagementController', () => {
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
    };

    jest.clearAllMocks();
  });

  describe('getReports', () => {
    it('should return paginated reports successfully', async () => {
      const mockReports = [
        {
          id: '1',
          targetType: 'post',
          targetId: 'post1',
          reason: 'Spam',
          status: 'PENDING',
          createdAt: new Date(),
        },
        {
          id: '2',
          targetType: 'comment',
          targetId: 'comment1',
          reason: 'Harassment',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      (reportManagementService.getPendingReports as jest.Mock).mockResolvedValue(mockReports);
      (prisma.report.count as jest.Mock).mockResolvedValue(25);

      mockRequest.query = {
        page: '1',
        limit: '10',
        targetType: 'post',
        severity: 'high',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReports(adminRequest, mockResponse as Response);

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
          total: 25,
          totalPages: 3,
        },
      });
    });

    it('should handle errors and return 500', async () => {
      (reportManagementService.getPendingReports as jest.Mock).mockRejectedValue(new Error('Database error'));

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReports(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Failed to fetch reports',
      });
    });
  });

  describe('getReport', () => {
    it('should return detailed report information for post target', async () => {
      const mockReport = {
        id: '1',
        targetType: 'post',
        targetId: 'post1',
        reason: 'Spam',
        status: 'PENDING',
        description: 'This post contains spam',
        reporter: {
          id: 'user1',
          username: 'reporter',
          email: 'reporter@test.com',
          role: 'USER',
          createdAt: new Date(),
        },
        resolvedBy: null,
      };

      const mockPostTarget = {
        id: 'post1',
        title: 'Spammy Post',
        author: { id: 'author1', username: 'author' },
        community: { id: 'comm1', name: 'Community', slug: 'community' },
      };

      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPostTarget);
      (prisma.report.count as jest.Mock).mockResolvedValue(2); // 1 current + 1 related

      mockRequest.params = { reportId: '1' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReport(adminRequest, mockResponse as Response);

      expect(prisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post1' },
        include: expect.any(Object),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockReport,
          target: mockPostTarget,
          relatedReportsCount: 1,
        }),
      });
    });

    it('should return detailed report information for comment target', async () => {
      const mockReport = {
        id: '1',
        targetType: 'comment',
        targetId: 'comment1',
        reporter: { id: 'user1', username: 'reporter' },
        resolvedBy: null,
      };

      const mockCommentTarget = {
        author: { id: 'author1', username: 'author' },
        post: {
          id: 'post1',
          title: 'Parent Post',
          community: { id: 'comm1', name: 'Community' },
        },
      };

      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);
      (prisma.comment.findUnique as jest.Mock).mockResolvedValue(mockCommentTarget);
      (prisma.report.count as jest.Mock).mockResolvedValue(1);

      mockRequest.params = { reportId: '1' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReport(adminRequest, mockResponse as Response);

      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'comment1' },
        include: expect.any(Object),
      });

      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockReport,
          target: mockCommentTarget,
          relatedReportsCount: 0,
        }),
      });
    });

    it('should return detailed report information for user target', async () => {
      const mockReport = {
        id: '1',
        targetType: 'user',
        targetId: 'user1',
        reporter: { id: 'user2', username: 'reporter' },
        resolvedBy: null,
      };

      const mockUserTarget = {
        id: 'user1',
        username: 'baduser',
        email: 'baduser@test.com',
        role: 'USER',
        createdAt: new Date(),
      };

      (prisma.report.findUnique as jest.Mock).mockResolvedValue(mockReport);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserTarget);
      (prisma.report.count as jest.Mock).mockResolvedValue(1);

      mockRequest.params = { reportId: '1' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReport(adminRequest, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: expect.any(Object),
      });

      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockReport,
          target: mockUserTarget,
          relatedReportsCount: 0,
        }),
      });
    });

    it('should return 404 if report not found', async () => {
      (prisma.report.findUnique as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { reportId: 'non-existent' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReport(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Report not found',
      });
    });
  });

  describe('reviewReport', () => {
    it('should approve report successfully', async () => {
      const mockReviewResult = {
        report: {
          id: '1',
          targetType: 'post',
          targetId: 'post1',
        },
        message: 'Report reviewed successfully',
      };

      (reportManagementService.reviewReport as jest.Mock).mockResolvedValue(mockReviewResult);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { reportId: '1' };
      mockRequest.body = {
        decision: 'approve',
        resolution: 'Content removed',
        moderationAction: 'delete_content',
        actionParams: { duration: 'permanent' },
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.reviewReport(adminRequest, mockResponse as Response);

      expect(reportManagementService.reviewReport).toHaveBeenCalledWith(
        '1',
        'admin-id',
        'approve',
        'Content removed'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-id',
          action: 'REPORT_APPROVE',
          target: 'REPORT',
          targetId: '1',
          details: expect.objectContaining({
            resolution: 'Content removed',
            moderationAction: 'delete_content',
            targetType: 'post',
            targetId: 'post1',
          }),
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          ...mockReviewResult,
          message: 'Report approved successfully',
        },
      });
    });

    it('should dismiss report successfully', async () => {
      const mockReviewResult = {
        report: { id: '1', targetType: 'comment', targetId: 'comment1' },
        message: 'Report dismissed',
      };

      (reportManagementService.reviewReport as jest.Mock).mockResolvedValue(mockReviewResult);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.params = { reportId: '1' };
      mockRequest.body = {
        decision: 'dismiss',
        resolution: 'No violation found',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.reviewReport(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          ...mockReviewResult,
          message: 'Report dismissed successfully',
        },
      });
    });

    it('should return 400 if invalid decision', async () => {
      mockRequest.params = { reportId: '1' };
      mockRequest.body = {
        decision: 'invalid',
        resolution: 'Test',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.reviewReport(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Valid decision (approve, dismiss, escalate) is required',
      });
    });

    it('should handle report review errors', async () => {
      (reportManagementService.reviewReport as jest.Mock).mockRejectedValue(
        new Error('Report not found')
      );

      mockRequest.params = { reportId: '1' };
      mockRequest.body = {
        decision: 'approve',
        resolution: 'Test approval',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.reviewReport(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Report not found',
      });
    });
  });

  describe('bulkReviewReports', () => {
    it('should bulk review reports successfully', async () => {
      const mockReviewResults = [
        { reportId: '1', success: true, result: { message: 'Success' } },
        { reportId: '2', success: true, result: { message: 'Success' } },
      ];

      (reportManagementService.reviewReport as jest.Mock).mockResolvedValue({ message: 'Success' });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = {
        reportIds: ['repo<fim-middle>rt1', 'report2'],
        decision: 'approve',
        resolution: 'Bulk approval',
        moderationAction: 'hide_content',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.bulkReviewReports(adminRequest, mockResponse as Response);

      expect(reportManagementService.reviewReport).toHaveBeenCalledTimes(2);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-id',
          action: 'BULK_REPORT_APPROVE',
          target: 'REPORT',
          targetId: null,
          details: {
            reportCount: 2,
            decision: 'approve',
            resolution: 'Bulk approval',
            successful: 2,
            failed: 0,
          },
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          total: 2,
          successful: 2,
          failed: 0,
          results: expect.any(Array),
          errors: [],
        },
      });
    });

    it('should return 400 if reportIds is not an array', async () => {
      mockRequest.body = {
        reportIds: 'invalid',
        decision: 'approve',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.bulkReviewReports(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Report IDs array is required',
      });
    });

    it('should return 400 if too many reports', async () => {
      const reportIds = Array.from({ length: 51 }, (_, i) => `report${i}`);

      mockRequest.body = {
        reportIds,
        decision: 'approve',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.bulkReviewReports(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Cannot process more than 50 reports at once',
      });
    });

    it('should handle partial failures', async () => {
      (reportManagementService.reviewReport as jest.Mock)
        .mockResolvedValueOnce({ message: 'Success' })
        .mockRejectedValueOnce(new Error('Report not found'));

      mockRequest.body = {
        reportIds: ['report1', 'report2'],
        decision: 'approve',
        resolution: 'Bulk approval',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.bulkReviewReports(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          total: 2,
          successful: 1,
          failed: 1,
          results: expect.any(Array),
          errors: expect.arrayContaining([
            expect.objectContaining({ reportId: 'report2' }),
          ]),
        }),
      });
    });
  });

  describe('getReportStats', () => {
    it('should return report statistics successfully', async () => {
      const mockStats = {
        totalReports: 100,
        pendingReports: 25,
        resolvedReports: 75,
        byStatus: { PENDING: 25, RESOLVED: 75 },
        byTargetType: { post: 60, comment: 30, user: 10 },
        averageResolutionTime: 8.5,
      };

      (reportManagementService.getReportStatistics as jest.Mock).mockResolvedValue(mockStats);

      mockRequest.query = { timeframe: 'week' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReportStats(adminRequest, mockResponse as Response);

      expect(reportManagementService.getReportStatistics).toHaveBeenCalledWith('week');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockStats });
    });
  });

  describe('quickAction', () => {
    it('should apply ban user action successfully', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user1', isActive: false });
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = {
        targetType: 'user',
        targetId: 'user1',
        action: 'ban_user',
        reason: 'Violation',
        duration: '7 days',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.quickAction(adminRequest, mockResponse as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { isActive: false },
      });

      expect(prisma.moderationLog.create).toHaveBeenCalledWith({
        data: {
          action: 'BAN_USER',
          targetType: 'user',
          targetId: 'user1',
          moderatorId: 'admin-id',
          reason: 'Admin quick action',
          metadata: { duration: '7 days' },
        },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: { message: 'Quick action applied successfully' },
      });
    });

    it('should apply delete content action for posts', async () => {
      (prisma.post.update as jest.Mock).mockResolvedValue({ deletedAt: new Date() });
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = {
        targetType: 'post',
        targetId: 'post1',
        action: 'delete_content',
        reason: 'Spam',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.quickAction(adminRequest, mockResponse as Response);

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post1' },
        data: { deletedAt: new Date() },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should apply hide content action for comments', async () => {
      (prisma.comment.update as jest.Mock).mockResolvedValue({ status: 'HIDDEN' });
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = {
        targetType: 'comment',
        targetId: 'comment1',
        action: 'hide_content',
        reason: 'Offensive',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.quickAction(adminRequest, mockResponse as Response);

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment1' },
        data: { status: 'HIDDEN' },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if required fields missing', async () => {
      mockRequest.body = {
        targetType: 'user',
        // missing targetId and action
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.quickAction(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Target type, target ID, and action are required',
      });
    });
  });

  describe('getReviewQueue', () => {
    it('should return review queue successfully', async () => {
      const highPriorityReports = [{ id: '1', severity: 'high', status: 'PENDING' }];
      const regularReports = [{ id: '2', severity: 'medium', status: 'PENDING' }];
      const escalatedReports = [{ id: '3', status: 'ESCALATED' }];

      (reportManagementService.getPendingReports as jest.Mock)
        .mockResolvedValueOnce(highPriorityReports)
        .mockResolvedValueOnce(regularReports)
        .mockResolvedValueOnce(escalatedReports);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await reportManagementController.getReviewQueue(adminRequest, mockResponse as Response);

      expect(reportManagementService.getPendingReports).toHaveBeenCalledTimes(3);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          highPriority: highPriorityReports,
          regular: regularReports,
          escalated: escalatedReports,
          summary: {
            highPriorityCount: 1,
            regularCount: 1,
            escalatedCount: 1,
          },
        },
      });
    });
  });
});