import { PrismaClient, ModerationAction, ModerationLog, ContentFilter, AutoModerationRule, BannedUser, FilterType, FilterSeverity, FilterAction } from '@prisma/client';
import { autoModerationService } from '../../../../../packages/moderation/src/services/autoModeration';
import { contentFilterService } from '../../../../../packages/moderation/src/services/contentFilter';
import { reportManagementService } from '../../../../../packages/moderation/src/services/reportManagement';
import { userModerationService } from '../../../../../packages/moderation/src/services/userModeration';
import { prisma } from '../lib/prisma';
import { logAdminAction, logSecurityEvent } from '../utils/auditLogger';

export interface ModerationRequest {
  action: ModerationAction;
  reason?: string;
  notes?: string;
  duration?: number; // for bans/mutes in hours/days
}

export interface BulkModerationRequest {
  targetIds: string[];
  targetType: 'post' | 'comment' | 'user' | 'message';
  action: ModerationAction;
  reason?: string;
  notes?: string;
  duration?: number;
}

export interface ContentModerationResult {
  allowed: boolean;
  violations: any[];
  actions: any[];
  reasons: any[];
}

class ModerationService {
  /**
   * Moderate specific content
   */
  async moderateContent(
    targetId: string,
    targetType: 'post' | 'comment' | 'user' | 'message',
    moderatorId: string,
    request: ModerationRequest
  ) {
    try {
      const targetData = await this.getTargetData(targetType, targetId);

      if (!targetData) {
        throw new Error(`${targetType} not found`);
      }

      // Execute the moderation action
      const result = await this.executeModerationAction(
        targetType,
        targetId,
        request,
        moderatorId
      );

      // Log the moderation action
      await this.logModerationAction({
        action: request.action,
        targetType: targetType,
        targetId,
        moderatorId,
        reason: request.reason,
        notes: request.notes,
        metadata: {
          duration: request.duration,
          targetData: this.sanitizeTargetData(targetData)
        }
      });

      return {
        success: true,
        result,
        logged: true
      };
    } catch (error) {
      await this.logModerationAction({
        action: ModerationAction.FLAG,
        targetType: targetType,
        targetId,
        moderatorId,
        reason: 'Moderation service error',
        notes: error instanceof Error ? error.message : 'Unknown error',
        metadata: { error: true }
      });
      throw error;
    }
  }

  /**
   * Bulk moderate multiple items
   */
  async bulkModerateContent(moderatorId: string, request: BulkModerationRequest) {
    const results = [];
    const errors = [];

    for (const targetId of request.targetIds) {
      try {
        const result = await this.moderateContent(
          targetId,
          request.targetType,
          moderatorId,
          {
            action: request.action,
            reason: request.reason,
            notes: `${request.notes} (Bulk operation)`,
            duration: request.duration
          }
        );
        results.push({ targetId, success: true, result });
      } catch (error) {
        results.push({
          targetId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errors.push({ targetId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return {
      success: errors.length === 0,
      processed: request.targetIds.length,
      successful: results.filter(r => r.success).length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Get moderation dashboard data
   */
  async getModerationDashboard() {
    const [
      pendingReports,
      recentLogs,
      activeContentFilters,
      activeRules,
      bannedCount
    ] = await Promise.all([
      reportManagementService.getPendingReports({
        limit: 10,
        severity: 'high'
      }),
      prisma.moderationLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          moderator: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      }),
      prisma.contentFilter.count({ where: { isActive: true } }),
      prisma.autoModerationRule.count({ where: { isActive: true } }),
      prisma.bannedUser.count({
        where: {
          bannedUntil: { gt: new Date() }
        }
      })
    ]);

    // Get stats
    const stats = await this.getModerationStats();

    return {
      pendingReports,
      recentActivity: recentLogs,
      activeFilters: activeContentFilters,
      activeRules,
      bannedUsers: bannedCount,
      stats
    };
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(timeframe: 'day' | 'week' | 'month' = 'week') {
    const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      logsCount,
      reportsCount,
      bannedCount,
      actionsByType
    ] = await Promise.all([
      prisma.moderationLog.count({ where: { createdAt: { gte: startDate } } }),
      prisma.report.count({ where: { createdAt: { gte: startDate } } }),
      prisma.bannedUser.count({ where: { createdAt: { gte: startDate } } }),
      prisma.moderationLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: true
      })
    ]);

    return {
      timeframe,
      totalLogs: logsCount,
      totalReports: reportsCount,
      totalBans: bannedCount,
      actionsBreakdown: actionsByType.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      startDate,
      endDate: new Date()
    };
  }

  /**
   * Process content through auto-moderation
   */
  async processContentAutoModeration(
    content: string,
    contentType: 'post' | 'comment' | 'message',
    authorId: string,
    metadata?: any
  ): Promise<ContentModerationResult> {
    return await autoModerationService.processContent(
      content,
      contentType,
      authorId,
      metadata
    );
  }

  /**
   * Check content against filters manually
   */
  async checkContentFilters(content: string) {
    return await contentFilterService.checkContent(content);
  }

  /**
   * Manage content filters
   */
  async createContentFilter(data: {
    name: string;
    type: FilterType;
    pattern: string;
    severity: FilterSeverity;
    action: FilterAction;
    createdBy: string;
  }, adminId?: string) {
    const filter = await prisma.contentFilter.create({
      data: {
        name: data.name,
        type: data.type,
        pattern: data.pattern,
        severity: data.severity,
        action: data.action,
        createdBy: data.createdBy,
        isActive: true
      }
    });

    // Log content filter creation
    await logAdminAction(adminId || data.createdBy, 'CONTENT_FILTER_CREATED', filter.id, {
      name: filter.name,
      type: filter.type,
      severity: filter.severity,
      action: filter.action
    });

    return filter;
  }

  async updateContentFilter(filterId: string, updates: Partial<ContentFilter>, adminId: string) {
    const filter = await prisma.contentFilter.findUnique({
      where: { id: filterId }
    });

    if (!filter) {
      throw new Error('Content filter not found');
    }

    const updatedFilter = await prisma.contentFilter.update({
      where: { id: filterId },
      data: updates
    });

    // Log content filter update
    await logAdminAction(adminId, 'CONTENT_FILTER_UPDATED', filterId, {
      previousValues: {
        name: filter.name,
        type: filter.type,
        severity: filter.severity,
        action: filter.action,
        isActive: filter.isActive
      },
      updatedFields: Object.keys(updates)
    });

    return updatedFilter;
  }

  async deleteContentFilter(filterId: string, adminId: string) {
    const filter = await prisma.contentFilter.findUnique({
      where: { id: filterId }
    });

    if (!filter) {
      throw new Error('Content filter not found');
    }

    await prisma.contentFilter.delete({
      where: { id: filterId }
    });

    // Log content filter deletion
    await logAdminAction(adminId, 'CONTENT_FILTER_DELETED', filterId, {
      name: filter.name,
      type: filter.type,
      severity: filter.severity
    });

    return { success: true, message: 'Content filter deleted successfully' };
  }

  async toggleContentFilter(filterId: string, isActive: boolean, adminId: string) {
    const filter = await prisma.contentFilter.findUnique({
      where: { id: filterId }
    });

    if (!filter) {
      throw new Error('Content filter not found');
    }

    const updatedFilter = await prisma.contentFilter.update({
      where: { id: filterId },
      data: { isActive }
    });

    // Log content filter status change
    await logAdminAction(adminId, `CONTENT_FILTER_${isActive ? 'ACTIVATED' : 'DEACTIVATED'}`, filterId, {
      name: filter.name,
      type: filter.type
    });

    return updatedFilter;
  }

  async getContentFilters(activeOnly = false) {
    return await prisma.contentFilter.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Private helper methods
   */
  private async executeModerationAction(
    targetType: string,
    targetId: string,
    request: ModerationRequest,
    moderatorId: string
  ) {
    switch (request.action) {
      case ModerationAction.APPROVE:
        return await this.approveContent(targetType, targetId);

      case ModerationAction.DELETE:
        return await this.deleteContent(targetType, targetId);

      case ModerationAction.FLAG:
        return await this.flagContent(targetType, targetId);

      case ModerationAction.WARN:
        return await userModerationService.warnUser(
          targetId,
          request.reason || 'Content violation',
          moderatorId
        );

      case ModerationAction.MUTE:
        return await userModerationService.muteUser(
          targetId,
          request.duration || 24,
          request.reason || 'Content violation',
          moderatorId
        );

      case ModerationAction.BAN:
        return await userModerationService.banUser(
          targetId,
          request.reason || 'Content violation',
          moderatorId,
          request.duration
        );

      case ModerationAction.UNBAN:
        return await userModerationService.unbanUser(
          targetId,
          request.reason || 'Appeal approved',
          moderatorId
        );

      default:
        throw new Error(`Unsupported moderation action: ${request.action}`);
    }
  }

  private async approveContent(targetType: string, targetId: string) {
    const updateData = { status: 'APPROVED' } as const;

    switch (targetType) {
      case 'post':
        return await prisma.post.update({
          where: { id: targetId },
          data: updateData as any
        });
      case 'comment':
        return await prisma.comment.update({
          where: { id: targetId },
          data: updateData as any
        });
      default:
        throw new Error(`Cannot approve content type: ${targetType}`);
    }
  }

  private async deleteContent(targetType: string, targetId: string) {
    const updateData = {
      deletedAt: new Date(),
      status: 'DELETED'
    } as const;

    switch (targetType) {
      case 'post':
        return await prisma.post.update({
          where: { id: targetId },
          data: updateData as any
        });
      case 'comment':
        return await prisma.comment.update({
          where: { id: targetId },
          data: updateData as any
        });
      default:
        throw new Error(`Cannot delete content type: ${targetType}`);
    }
  }

  private async hideContent(targetType: string, targetId: string) {
    const updateData = { status: 'HIDDEN' } as const;

    switch (targetType) {
      case 'post':
        return await prisma.post.update({
          where: { id: targetId },
          data: updateData as any
        });
      case 'comment':
        return await prisma.comment.update({
          where: { id: targetId },
          data: updateData as any
        });
      default:
        throw new Error(`Cannot hide content type: ${targetType}`);
    }
  }

  private async flagContent(targetType: string, targetId: string) {
    // For now, just update status to FLAGGED
    const updateData = { status: 'FLAGGED' } as const;

    switch (targetType) {
      case 'post':
        return await prisma.post.update({
          where: { id: targetId },
          data: updateData as any
        });
      case 'comment':
        return await prisma.comment.update({
          where: { id: targetId },
          data: updateData as any
        });
      default:
        return { action: 'flagged', targetType, targetId };
    }
  }

  private async getTargetData(targetType: string, targetId: string) {
    switch (targetType) {
      case 'post':
        return await prisma.post.findUnique({
          where: { id: targetId },
          include: {
            author: {
              select: { id: true, username: true, email: true }
            }
          }
        });
      case 'comment':
        return await prisma.comment.findUnique({
          where: { id: targetId },
          include: {
            author: {
              select: { id: true, username: true, email: true }
            }
          }
        });
      case 'user':
        return await prisma.user.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true
          }
        });
      default:
        return null;
    }
  }

  private sanitizeTargetData(data: any): any {
    if (!data) return null;

    // Remove sensitive information from audit logs
    const { createdAt, updatedAt, ...sanitized } = data;

    // Keep only essential fields for moderation context
    if (sanitized.author) {
      sanitized.author = {
        id: sanitized.author.id,
        username: sanitized.author.username
      };
    }

    return sanitized;
  }

  private async logModerationAction(data: {
    action: ModerationAction;
    targetType: string;
    targetId: string;
    moderatorId: string;
    reason?: string;
    notes?: string;
    metadata?: any;
  }) {
    return await prisma.moderationLog.create({
      data: {
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        moderatorId: data.moderatorId,
        reason: data.reason,
        notes: data.notes,
        metadata: data.metadata
      }
    });
  }

  /**
   * AUTO-MODERATION RULE MANAGEMENT
   */

  async createAutoModerationRule(data: {
    name: string;
    description?: string;
    conditions: any;
    actions: any;
    priority?: number;
    createdBy: string;
  }, adminId: string) {
    const rule = await prisma.autoModerationRule.create({
      data: {
        name: data.name,
        description: data.description,
        conditions: data.conditions,
        actions: data.actions,
        priority: data.priority || 0,
        createdBy: data.createdBy,
        isActive: true
      }
    });

    // Log auto-moderation rule creation
    await logAdminAction(adminId, 'AUTO_MODERATION_RULE_CREATED', rule.id, {
      name: rule.name,
      priority: rule.priority,
      conditionsCount: Array.isArray(rule.conditions) ? rule.conditions.length : 1,
      actionsCount: Array.isArray(rule.actions) ? rule.actions.length : 1
    });

    return rule;
  }

  async updateAutoModerationRule(ruleId: string, updates: Partial<AutoModerationRule>, adminId: string) {
    const rule = await prisma.autoModerationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) {
      throw new Error('Auto-moderation rule not found');
    }

    const { createdBy, createdAt, updatedAt, id, ...updateFields } = updates;
    const updatedRule = await prisma.autoModerationRule.update({
      where: { id: ruleId },
      data: updateFields as any
    });

    // Log auto-moderation rule update
    await logAdminAction(adminId, 'AUTO_MODERATION_RULE_UPDATED', ruleId, {
      name: rule.name,
      updatedFields: Object.keys(updates),
      priorityChanged: updates.priority !== rule.priority,
      statusChanged: updates.isActive !== rule.isActive
    });

    return updatedRule;
  }

  async deleteAutoModerationRule(ruleId: string, adminId: string) {
    const rule = await prisma.autoModerationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) {
      throw new Error('Auto-moderation rule not found');
    }

    await prisma.autoModerationRule.delete({
      where: { id: ruleId }
    });

    // Log auto-moderation rule deletion
    await logAdminAction(adminId, 'AUTO_MODERATION_RULE_DELETED', ruleId, {
      name: rule.name,
      priority: rule.priority
    });

    return { success: true, message: 'Auto-moderation rule deleted successfully' };
  }

  async toggleAutoModerationRule(ruleId: string, isActive: boolean, adminId: string) {
    const rule = await prisma.autoModerationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) {
      throw new Error('Auto-moderation rule not found');
    }

    const updatedRule = await prisma.autoModerationRule.update({
      where: { id: ruleId },
      data: { isActive }
    });

    // Log auto-moderation rule status change
    await logAdminAction(adminId, `AUTO_MODERATION_RULE_${isActive ? 'ACTIVATED' : 'DEACTIVATED'}`, ruleId, {
      name: rule.name,
      priority: rule.priority
    });

    return updatedRule;
  }

  async getAutoModerationRules(activeOnly = false) {
    return await prisma.autoModerationRule.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { priority: 'desc' }
    });
  }

  async getAutoModerationRuleById(ruleId: string) {
    const rule = await prisma.autoModerationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) {
      throw new Error('Auto-moderation rule not found');
    }

    return rule;
  }
}

export const moderationService = new ModerationService();