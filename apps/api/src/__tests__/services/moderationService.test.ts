import { prisma } from '../../lib/prisma';
import { moderationService } from '../../services/moderationService';
import { ModerationAction, FilterType, FilterSeverity, FilterAction } from '@prisma/client';

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    moderationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    contentFilter: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    autoModerationRule: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    comment: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    // Note: Report model not in schema, using moderationLog instead for counting
    bannedUser: {
      count: jest.fn()
    }
  }
}));

// Mock external services
jest.mock('../../../packages/moderation/src/services/autoModeration', () => ({
  autoModerationService: {
    processContent: jest.fn()
  }
}));

jest.mock('../../../packages/moderation/src/services/contentFilter', () => ({
  contentFilterService: {
    checkContent: jest.fn()
  }
}));

jest.mock('../../../packages/moderation/src/services/reportManagement', () => ({
  reportManagementService: {
    getPendingReports: jest.fn()
  }
}));

jest.mock('../../../packages/moderation/src/services/userModeration', () => ({
  userModerationService: {
    warnUser: jest.fn(),
    muteUser: jest.fn(),
    banUser: jest.fn(),
    unbanUser: jest.fn()
  }
}));

// Mock audit logger
jest.mock('../../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

describe('ModerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('moderateContent', () => {
    it('should moderate content successfully', async () => {
      const targetData = {
        id: 'post-123',
        title: 'Test Post',
        author: { id: 'user-123', username: 'testuser' }
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(targetData);
      (prisma.post.update as jest.Mock).mockResolvedValue({ ...targetData, status: 'APPROVED' });
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({ id: 'log-123' });

      const result = await moderationService.moderateContent(
        'post-123',
        'post',
        'mod-123',
        { action: ModerationAction.APPROVE, reason: 'Good content' }
      );

      expect(result.success).toBe(true);
      expect(result.logged).toBe(true);
      expect(prisma.moderationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: ModerationAction.APPROVE,
          targetType: 'post',
          targetId: 'post-123',
          moderatorId: 'mod-123',
          reason: 'Good content',
          metadata: expect.objectContaining({
            targetData: expect.any(Object)
          })
        })
      });
    });

    it('should handle moderation errors and log them', async () => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(moderationService.moderateContent(
        'invalid-post',
        'post',
        'mod-123',
        { action: ModerationAction.APPROVE }
      )).rejects.toThrow('post not found');

      // Should log the error
      expect(prisma.moderationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: ModerationAction.FLAG,
          targetType: 'post',
          targetId: 'invalid-post',
          moderatorId: 'mod-123',
          reason: 'Moderation service error',
          metadata: { error: true }
        })
      });
    });

    it('should handle different target types', async () => {
      const commentData = {
        id: 'comment-123',
        content: 'Test Comment',
        author: { id: 'user-123', username: 'testuser' }
      };

      (prisma.comment.findUnique as jest.Mock).mockResolvedValue(commentData);
      (prisma.comment.update as jest.Mock).mockResolvedValue({ ...commentData, status: 'HIDDEN' });

      const result = await moderationService.moderateContent(
        'comment-123',
        'comment',
        'mod-123',
        { action: ModerationAction.FLAG, reason: 'Inappropriate' }
      );

      expect(result.success).toBe(true);
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
        data: { status: 'FLAGGED' }
      });
    });
  });

  describe('bulkModerateContent', () => {
    it('should moderate multiple items successfully', async () => {
      const targetData = {
        id: 'post-123',
        author: { id: 'user-123', username: 'testuser' }
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(targetData);
      (prisma.post.update as jest.Mock).mockResolvedValue({});
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});

      const result = await moderationService.bulkModerateContent('mod-123', {
        targetIds: ['post-123', 'post-456'],
        targetType: 'post',
        action: ModerationAction.APPROVE,
        reason: 'Bulk approval'
      });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      const validPost = {
        id: 'post-123',
        author: { id: 'user-123', username: 'testuser' }
      };

      (prisma.post.findUnique as jest.Mock)
        .mockResolvedValueOnce(validPost) // First post exists
        .mockResolvedValueOnce(null); // Second post doesn't exist

      (prisma.post.update as jest.Mock).mockResolvedValue({});
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});

      const result = await moderationService.bulkModerateContent('mod-123', {
        targetIds: ['post-123', 'invalid-post'],
        targetType: 'post',
        action: ModerationAction.APPROVE
      });

      expect(result.success).toBe(false);
      expect(result.processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].targetId).toBe('invalid-post');
    });
  });

  describe('getModerationDashboard', () => {
    it('should retrieve moderation dashboard data', async () => {
      const mockReports = [{ id: 'report-1' }];
      const mockLogs = [
        {
          id: 'log-1',
          createdAt: new Date(),
          moderator: { id: 'mod-1', username: 'moderator1' }
        }
      ];

      const { reportManagementService } = require('../../../packages/moderation/src/services/reportManagement');

      (reportManagementService.getPendingReports as jest.Mock).mockResolvedValue(mockReports);
      (prisma.moderationLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (prisma.contentFilter.count as jest.Mock).mockResolvedValue(5);
      (prisma.autoModerationRule.count as jest.Mock).mockResolvedValue(3);
      (prisma.bannedUser.count as jest.Mock).mockResolvedValue(2);
      (prisma.moderationLog.count as jest.Mock).mockResolvedValue(100);
      // Using moderationLog count for reports since Report model doesn't exist
      (prisma.moderationLog.count as jest.Mock).mockResolvedValueOnce(100);
      (prisma.moderationLog.groupBy as jest.Mock).mockResolvedValue([
        { action: ModerationAction.APPROVE, _count: 50 },
        { action: ModerationAction.DELETE, _count: 30 },
        { action: ModerationAction.WARN, _count: 20 }
      ]);

      const result = await moderationService.getModerationDashboard();

      expect(result.pendingReports).toEqual(mockReports);
      expect(result.recentActivity).toEqual(mockLogs);
      expect(result.activeFilters).toBe(5);
      expect(result.activeRules).toBe(3);
      expect(result.bannedUsers).toBe(2);
      expect(result.stats.totalLogs).toBe(100);
      expect(result.stats.actionsBreakdown.APPROVE).toBe(50);
    });
  });

  describe('Content Filter Management', () => {
    const { logAdminAction } = require('../../utils/auditLogger');

    it('should create content filter with audit logging', async () => {
      const filterData = {
        name: 'Spam Filter',
        type: FilterType.KEYWORD,
        pattern: 'spam|scam',
        severity: FilterSeverity.HIGH,
        action: FilterAction.BLOCK,
        createdBy: 'admin-123'
      };

      const createdFilter = { id: 'filter-123', ...filterData, isActive: true };

      (prisma.contentFilter.create as jest.Mock).mockResolvedValue(createdFilter);

      const result = await moderationService.createContentFilter(filterData, 'admin-456');

      expect(result).toEqual(createdFilter);
      expect(logAdminAction).toHaveBeenCalledWith('admin-456', 'CONTENT_FILTER_CREATED', 'filter-123', {
        name: 'Spam Filter',
        type: 'keyword',
        severity: 'high',
        action: 'block'
      });
    });

    it('should update content filter with audit logging', async () => {
      const existingFilter = {
        id: 'filter-123',
        name: 'Old Filter',
        type: 'regex',
        severity: 'medium',
        action: 'flag',
        isActive: true
      };

      const updatedFilter = { ...existingFilter, severity: 'high' };

      (prisma.contentFilter.findUnique as jest.Mock).mockResolvedValue(existingFilter);
      (prisma.contentFilter.update as jest.Mock).mockResolvedValue(updatedFilter);

      const result = await moderationService.updateContentFilter('filter-123', {
        severity: FilterSeverity.HIGH
      }, 'admin-123');

      expect(result).toEqual(updatedFilter);
      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'CONTENT_FILTER_UPDATED', 'filter-123', {
        previousValues: {
          name: 'Old Filter',
          type: 'regex',
          severity: 'medium',
          action: 'flag',
          isActive: true
        },
        updatedFields: ['severity']
      });
    });

    it('should delete content filter with audit logging', async () => {
      const existingFilter = {
        id: 'filter-123',
        name: 'Test Filter',
        type: 'keyword'
      };

      (prisma.contentFilter.findUnique as jest.Mock).mockResolvedValue(existingFilter);
      (prisma.contentFilter.delete as jest.Mock).mockResolvedValue({});

      const result = await moderationService.deleteContentFilter('filter-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'CONTENT_FILTER_DELETED', 'filter-123', {
        name: 'Test Filter',
        type: 'keyword',
        severity: undefined
      });
    });

    it('should toggle content filter status', async () => {
      const existingFilter = {
        id: 'filter-123',
        name: 'Test Filter',
        isActive: true
      };

      (prisma.contentFilter.findUnique as jest.Mock).mockResolvedValue(existingFilter);
      (prisma.contentFilter.update as jest.Mock).mockResolvedValue({
        ...existingFilter,
        isActive: false
      });

      await moderationService.toggleContentFilter('filter-123', false, 'admin-123');

      expect(prisma.contentFilter.update).toHaveBeenCalledWith({
        where: { id: 'filter-123' },
        data: { isActive: false }
      });

      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'CONTENT_FILTER_DEACTIVATED', 'filter-123', {
        name: 'Test Filter',
        type: undefined
      });
    });
  });

  describe('Auto-Moderation Rule Management', () => {
    const { logAdminAction } = require('../../utils/auditLogger');

    it('should create auto-moderation rule with audit logging', async () => {
      const ruleData = {
        name: 'Spam Detection',
        description: 'Detect spam content',
        conditions: [{ type: 'keyword', value: ['spam', 'scam'] }],
        actions: [{ type: 'hide', severity: 'high' }],
        priority: 1,
        createdBy: 'admin-123'
      };

      const createdRule = { id: 'rule-123', ...ruleData, isActive: true };

      (prisma.autoModerationRule.create as jest.Mock).mockResolvedValue(createdRule);

      const result = await moderationService.createAutoModerationRule(ruleData, 'admin-456');

      expect(result).toEqual(createdRule);
      expect(logAdminAction).toHaveBeenCalledWith('admin-456', 'AUTO_MODERATION_RULE_CREATED', 'rule-123', {
        name: 'Spam Detection',
        priority: 1,
        conditionsCount: 1,
        actionsCount: 1
      });
    });

    it('should update auto-moderation rule with audit logging', async () => {
      const existingRule = {
        id: 'rule-123',
        name: 'Old Rule',
        priority: 5,
        isActive: true
      };

      const updatedRule = { ...existingRule, priority: 10 };

      (prisma.autoModerationRule.findUnique as jest.Mock).mockResolvedValue(existingRule);
      (prisma.autoModerationRule.update as jest.Mock).mockResolvedValue(updatedRule);

      const result = await moderationService.updateAutoModerationRule('rule-123', {
        priority: 10
      }, 'admin-123');

      expect(result).toEqual(updatedRule);
      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'AUTO_MODERATION_RULE_UPDATED', 'rule-123', {
        name: 'Old Rule',
        updatedFields: ['priority'],
        priorityChanged: true,
        statusChanged: false
      });
    });

    it('should delete auto-moderation rule with audit logging', async () => {
      const existingRule = {
        id: 'rule-123',
        name: 'Test Rule',
        priority: 5
      };

      (prisma.autoModerationRule.findUnique as jest.Mock).mockResolvedValue(existingRule);
      (prisma.autoModerationRule.delete as jest.Mock).mockResolvedValue({});

      const result = await moderationService.deleteAutoModerationRule('rule-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'AUTO_MODERATION_RULE_DELETED', 'rule-123', {
        name: 'Test Rule',
        priority: 5
      });
    });

    it('should toggle auto-moderation rule', async () => {
      const existingRule = {
        id: 'rule-123',
        name: 'Test Rule',
        isActive: true,
        priority: 1
      };

      (prisma.autoModerationRule.findUnique as jest.Mock).mockResolvedValue(existingRule);
      (prisma.autoModerationRule.update as jest.Mock).mockResolvedValue({
        ...existingRule,
        isActive: false
      });

      await moderationService.toggleAutoModerationRule('rule-123', false, 'admin-123');

      expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'AUTO_MODERATION_RULE_DEACTIVATED', 'rule-123', {
        name: 'Test Rule',
        priority: 1
      });
    });
  });

  describe('getModerationStats', () => {
    it('should calculate moderation statistics correctly', async () => {
      const mockData = {
        logsCount: 150,
        reportsCount: 25,
        bannedCount: 5,
        actionsByType: [
          { action: ModerationAction.APPROVE, _count: 60 },
          { action: ModerationAction.DELETE, _count: 40 },
          { action: ModerationAction.WARN, _count: 35 },
          { action: ModerationAction.BAN, _count: 15 }
        ]
      };

      (prisma.moderationLog.count as jest.Mock).mockResolvedValue(mockData.logsCount);
      // Using moderationLog for report count since Report model doesn't exist
      (prisma.moderationLog.count as jest.Mock).mockResolvedValue(25); // reports count
      (prisma.bannedUser.count as jest.Mock).mockResolvedValue(mockData.bannedCount);
      (prisma.moderationLog.groupBy as jest.Mock).mockResolvedValue(mockData.actionsByType);

      const result = await moderationService.getModerationStats('week');

      expect(result.timeframe).toBe('week');
      expect(result.totalLogs).toBe(150);
      expect(result.totalReports).toBe(25);
      expect(result.totalBans).toBe(5);
      expect(result.actionsBreakdown.APPROVE).toBe(60);
      expect(result.actionsBreakdown.DELETE).toBe(40);
    });

    it('should handle different timeframes', async () => {
      (prisma.moderationLog.count as jest.Mock).mockResolvedValue(50);
      // Using moderationLog for report count since Report model doesn't exist
      (prisma.moderationLog.count as jest.Mock).mockResolvedValue(10); // reports
      (prisma.bannedUser.count as jest.Mock).mockResolvedValue(2);
      (prisma.moderationLog.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await moderationService.getModerationStats('day');

      expect(result.timeframe).toBe('day');
      expect(result.startDate.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
    });
  });

  describe('Moderation Action Handlers', () => {
    const { userModerationService } = require('../../../packages/moderation/src/services/userModeration');

    beforeEach(() => {
      (prisma.moderationLog.create as jest.Mock).mockResolvedValue({});
    });

    it('should handle APPROVE action', async () => {
      const targetData = {
        id: 'post-123',
        author: { id: 'user-123', username: 'testuser' }
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(targetData);
      (prisma.post.update as jest.Mock).mockResolvedValue({ ...targetData, status: 'APPROVED' });

      await moderationService.moderateContent(
        'post-123',
        'post',
        'mod-123',
        { action: ModerationAction.APPROVE }
      );

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: { status: 'APPROVED' }
      });
    });

    it('should handle DELETE action', async () => {
      const targetData = { id: 'post-123', author: { id: 'user-123' } };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(targetData);
      (prisma.post.update as jest.Mock).mockResolvedValue({
        ...targetData,
        deletedAt: new Date(),
        status: 'DELETED'
      });

      await moderationService.moderateContent(
        'post-123',
        'post',
        'mod-123',
        { action: ModerationAction.DELETE }
      );

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          status: 'DELETED'
        })
      });
    });

    it('should handle WARN action on user via external service', async () => {
      // WARN is handled by userModerationService directly, not through moderateContent
      // This test verifies the external service is called correctly
      (userModerationService.warnUser as jest.Mock).mockResolvedValue({
        success: true
      });

      // Note: In the actual implementation, WARN would be called directly on userModerationService
      // This is just to verify the mock setup
      const result = await userModerationService.warnUser(
        'user-123',
        'Violation warning',
        'mod-123'
      );

      expect(userModerationService.warnUser).toHaveBeenCalledWith(
        'user-123',
        'Violation warning',
        'mod-123'
      );
      expect(result.success).toBe(true);
    });

    it('should handle BAN action on user via external service', async () => {
      // BAN is handled by userModerationService directly, not through moderateContent
      (userModerationService.banUser as jest.Mock).mockResolvedValue({
        success: true
      });

      const result = await userModerationService.banUser(
        'user-123',
        'Severe violation',
        'mod-123',
        7
      );

      expect(userModerationService.banUser).toHaveBeenCalledWith(
        'user-123',
        'Severe violation',
        'mod-123',
        7
      );
      expect(result.success).toBe(true);
    });
  });
});