import { Response } from 'express';
import { BaseController } from '../baseController';
import { AdminRequest } from '../../middleware/admin';
import { reportManagementService } from '../../../packages/moderation/src/services/reportManagement';
import { prisma } from '../../lib/prisma';

class ReportManagementController extends BaseController {
  /**
   * GET /api/admin/reports
   * Get paginated list of reports for admin review
   */
  async getReports(req: AdminRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        targetType = '',
        severity = 'all',
        status = 'pending'
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const offset = (pageNum - 1) * limitNum;

      const options: any = {
        limit: limitNum,
        offset,
        severity
      };

      if (targetType) {
        options.targetType = targetType;
      }

      const reports = await reportManagementService.getPendingReports(options);
      const total = await this.getReportCount(targetType as string, status as string);

      this.sendPaginated(res, reports, pageNum, limitNum, total);
    } catch (error: any) {
      console.error('Failed to get reports:', error);
      this.sendError(res, 'Failed to fetch reports', 500);
    }
  }

  /**
   * GET /api/admin/reports/:reportId
   * Get detailed report information
   */
  async getReport(req: AdminRequest, res: Response) {
    try {
      const { reportId } = req.params;

      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              createdAt: true
            }
          },
          resolvedBy: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      });

      if (!report) {
        return this.sendError(res, 'Report not found', 404);
      }

      // Get target data
      let targetData = null;
      switch (report.targetType) {
        case 'post':
          targetData = await prisma.post.findUnique({
            where: { id: report.targetId },
            include: {
              author: { select: { id: true, username: true } },
              community: { select: { id: true, name: true, slug: true } }
            }
          });
          break;
        case 'comment':
          targetData = await prisma.comment.findUnique({
            where: { id: report.targetId },
            include: {
              author: { select: { id: true, username: true } },
              post: {
                select: {
                  id: true,
                  title: true,
                  community: { select: { id: true, name: true, slug: true } }
                }
              }
            }
          });
          break;
        case 'user':
          targetData = await prisma.user.findUnique({
            where: { id: report.targetId },
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              createdAt: true
            }
          });
          break;
      }

      // Get related reports
      const relatedReports = await prisma.report.count({
        where: {
          targetType: report.targetType,
          targetId: report.targetId,
          status: { in: ['PENDING', 'REVIEWING'] }
        }
      });

      this.sendSuccess(res, {
        ...report,
        target: targetData,
        relatedReportsCount: relatedReports - 1 // Exclude current report
      });
    } catch (error: any) {
      console.error('Failed to get report:', error);
      this.sendError(res, 'Failed to fetch report details', 500);
    }
  }

  /**
   * POST /api/admin/reports/:reportId/review
   * Review and take action on a report
   */
  async reviewReport(req: AdminRequest, res: Response) {
    try {
      const { reportId } = req.params;
      const { decision, resolution, moderationAction, actionParams } = req.body;

      if (!decision || !['approve', 'dismiss', 'escalate'].includes(decision)) {
        return this.sendError(res, 'Valid decision (approve, dismiss, escalate) is required', 400);
      }

      const result = await reportManagementService.reviewReport(
        reportId,
        req.admin.id,
        decision,
        resolution
      );

      // If approved and moderation action specified, apply additional moderation
      if (decision === 'approve' && moderationAction) {
        await this.applyAdditionalModeration(
          result.report.targetType,
          result.report.targetId,
          moderationAction,
          actionParams,
          req.admin.id
        );
      }

      // Log admin action
      await this.logAdminAction(req.admin.id, `REPORT_${decision.toUpperCase()}`, reportId, {
        resolution,
        moderationAction,
        targetType: result.report.targetType,
        targetId: result.report.targetId
      });

      this.sendSuccess(res, {
        ...result,
        message: `Report ${decision}d successfully`
      });
    } catch (error: any) {
      console.error('Failed to review report:', error);
      this.sendError(res, error.message || 'Failed to review report', 500);
    }
  }

  /**
   * POST /api/admin/reports/bulk-review
   * Review multiple reports at once
   */
  async bulkReviewReports(req: AdminRequest, res: Response) {
    try {
      const { reportIds, decision, resolution, moderationAction } = req.body;

      if (!Array.isArray(reportIds) || reportIds.length === 0) {
        return this.sendError(res, 'Report IDs array is required', 400);
      }

      if (reportIds.length > 50) {
        return this.sendError(res, 'Cannot process more than 50 reports at once', 400);
      }

      const results = [];
      const errors = [];

      for (const reportId of reportIds) {
        try {
          const result = await reportManagementService.reviewReport(
            reportId,
            req.admin.id,
            decision,
            resolution
          );
          results.push({ reportId, success: true, result });
        } catch (error: any) {
          results.push({
            reportId,
            success: false,
            error: error.message || 'Unknown error'
          });
          errors.push({ reportId, error: error.message || 'Unknown error' });
        }
      }

      // Log bulk action
      await this.logAdminAction(req.admin.id, `BULK_REPORT_${decision.toUpperCase()}`, null, {
        reportCount: reportIds.length,
        decision,
        resolution,
        successful: results.filter(r => r.success).length,
        failed: errors.length
      });

      this.sendSuccess(res, {
        total: reportIds.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      console.error('Failed to bulk review reports:', error);
      this.sendError(res, 'Failed to bulk review reports', 500);
    }
  }

  /**
   * GET /api/admin/reports/stats
   * Get report management statistics
   */
  async getReportStats(req: AdminRequest, res: Response) {
    try {
      const { timeframe = 'week' } = req.query;

      const stats = await reportManagementService.getReportStatistics(
        timeframe as 'day' | 'week' | 'month' | 'all'
      );

      this.sendSuccess(res, stats);
    } catch (error: any) {
      console.error('Failed to get report stats:', error);
      this.sendError(res, 'Failed to get report statistics', 500);
    }
  }

  /**
   * POST /api/admin/reports/quick-action
   * Quick moderation actions (ban user, delete content, etc.)
   */
  async quickAction(req: AdminRequest, res: Response) {
    try {
      const { targetType, targetId, action, reason, duration } = req.body;

      if (!targetType || !targetId || !action) {
        return this.sendError(res, 'Target type, target ID, and action are required', 400);
      }

      await this.applyAdditionalModeration(targetType, targetId, action, { duration }, req.admin.id);

      await this.logAdminAction(req.admin.id, `QUICK_ACTION_${action.toUpperCase()}`, targetId, {
        targetType,
        action,
        reason,
        duration
      });

      this.sendSuccess(res, { message: 'Quick action applied successfully' });
    } catch (error: any) {
      console.error('Failed to apply quick action:', error);
      this.sendError(res, error.message || 'Failed to apply quick action', 500);
    }
  }

  /**
   * GET /api/admin/reports/queue
   * Get admin review queue (reports needing attention)
   */
  async getReviewQueue(req: AdminRequest, res: Response) {
    try {
      const highPriorityReports = await reportManagementService.getPendingReports({
        limit: 20,
        severity: 'high'
      });

      const regularReports = await reportManagementService.getPendingReports({
        limit: 30,
        severity: 'medium'
      });

      const escalatedReports = await reportManagementService.getPendingReports({
        limit: 10
      });
      const escalatedFiltered = escalatedReports.filter(r => r.status === 'ESCALATED');

      this.sendSuccess(res, {
        highPriority: highPriorityReports,
        regular: regularReports,
        escalated: escalatedFiltered,
        summary: {
          highPriorityCount: highPriorityReports.length,
          regularCount: regularReports.length,
          escalatedCount: escalatedFiltered.length
        }
      });
    } catch (error: any) {
      console.error('Failed to get review queue:', error);
      this.sendError(res, 'Failed to get review queue', 500);
    }
  }

  // Helper methods

  private async getReportCount(targetType: string, status: string): Promise<number> {
    const where: any = {};

    if (targetType) {
      where.targetType = targetType;
    }

    where.status = status === 'pending' ? { in: ['PENDING', 'REVIEWING'] } : status.toUpperCase();

    return await prisma.report.count({ where });
  }

  private async applyAdditionalModeration(
    targetType: string,
    targetId: string,
    action: string,
    params: any,
    moderatorId: string
  ) {
    // This can be expanded based on moderation needs
    switch (action) {
      case 'ban_user':
        await prisma.user.update({
          where: { id: targetId },
          data: { isActive: false }
        });
        break;
      case 'delete_content':
        if (targetType === 'post') {
          await prisma.post.update({
            where: { id: targetId },
            data: { deletedAt: new Date() }
          });
        } else if (targetType === 'comment') {
          await prisma.comment.update({
            where: { id: targetId },
            data: { deletedAt: new Date() }
          });
        }
        break;
      case 'hide_content':
        const updateData = { status: 'HIDDEN' };
        if (targetType === 'post') {
          await prisma.post.update({
            where: { id: targetId },
            data: updateData
          });
        } else if (targetType === 'comment') {
          await prisma.comment.update({
            where: { id: targetId },
            data: updateData
          });
        }
        break;
      default:
        console.warn(`Unknown quick action: ${action}`);
    }

    // Log the moderation action
    await prisma.moderationLog.create({
      data: {
        action: action.toUpperCase(),
        targetType,
        targetId,
        moderatorId,
        reason: 'Admin quick action',
        metadata: params
      }
    });
  }

  private async logAdminAction(userId: string, action: string, targetId?: string, details?: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          target: 'REPORT',
          targetId,
          details
        }
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }
}

export const reportManagementController = new ReportManagementController();