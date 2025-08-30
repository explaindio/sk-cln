import { prisma } from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';
import {
  ReportStatus,
  ReportReason,
  ModerationAction
} from '@prisma/client';

interface CreateReportRequest {
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'message';
  reason: ReportReason;
  description?: string;
  evidenceUrls?: string[];
}

interface ReviewReportRequest {
  action: 'resolve' | 'escalate' | 'dismiss';
  resolution?: string;
  actionTaken?: ModerationAction;
  notes?: string;
}

interface ReportAnalytics {
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  escalatedReports: number;
  dismissedReports: number;
  reportsByReason: Record<string, number>;
  reportsByTargetType: Record<string, number>;
  reportsBySeverity: Record<string, number>;
  averageResolutionTime: number;
}

export class ReportsService {

  /**
   * GET REPORTS
   */

  async getReports(options?: {
    page?: number;
    limit?: number;
    status?: ReportStatus;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    targetType?: string;
    reason?: ReportReason;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      targetType,
      reason,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    const offset = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (targetType) where.targetType = targetType;
    if (reason) where.reason = reason;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, username: true, email: true }
          },
          reviewedBy: {
            select: { id: true, username: true }
          },
          targetPost: {
            select: {
              id: true,
              title: true,
              createdAt: true,
              author: { select: { id: true, username: true } }
            }
          },
          targetComment: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: { select: { id: true, username: true } }
            }
          },
          targetUser: {
            select: { id: true, username: true, email: true, isActive: true }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.report.count({ where })
    ]);

    return {
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getReportById(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true, username: true, email: true }
        },
        reviewedBy: {
          select: { id: true, username: true }
        },
        targetPost: {
          include: {
            author: { select: { id: true, username: true } },
            community: { select: { id: true, name: true, slug: true } }
          }
        },
        targetComment: {
          include: {
            author: { select: { id: true, username: true } },
            post: {
              include: {
                author: { select: { id: true, username: true } },
                community: { select: { id: true, name: true, slug: true } }
              }
            }
          }
        },
        targetUser: {
          select: { id: true, username: true, email: true, isActive: true }
        },
        moderationLog: {
          include: {
            moderator: { select: { id: true, username: true } }
          }
        }
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return { success: true, data: report };
  }

  /**
   * CREATE REPORT
   */

  async createReport(data: CreateReportRequest, reporterId: string) {
    // Verify target exists
    await this.verifyTargetExists(data.targetId, data.targetType);

    // Determine severity based on reason
    const severity = this.determineSeverity(data.reason);

    const report = await prisma.report.create({
      data: {
        targetId: data.targetId,
        targetType: data.targetType,
        reporterId,
        reason: data.reason,
        description: data.description,
        evidenceUrls: data.evidenceUrls || [],
        severity
      },
      include: {
        reporter: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    // Log admin action (though this is typically user-initiated, we still track it)
    await logAdminAction('system', 'REPORT_CREATED', report.id, {
      targetId: data.targetId,
      targetType: data.targetType,
      reason: data.reason,
      severity
    });

    return { success: true, data: report };
  }

  /**
   * REVIEW REPORT
   */

  async reviewReport(reportId: string, data: ReviewReportRequest, adminId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== ReportStatus.PENDING) {
      throw new Error('Report has already been reviewed');
    }

    let newStatus: ReportStatus;
    switch (data.action) {
      case 'resolve':
        newStatus = ReportStatus.RESOLVED;
        break;
      case 'escalate':
        newStatus = ReportStatus.ESCALATED;
        break;
      case 'dismiss':
        newStatus = ReportStatus.DISMISSED;
        break;
      default:
        throw new Error('Invalid action');
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewedById: adminId,
        reviewedAt: new Date(),
        resolution: data.resolution,
        actionTaken: data.actionTaken
      },
      include: {
        reviewer: {
          select: { id: true, username: true }
        }
      }
    });

    // Log admin action
    await logAdminAction(adminId, `REPORT_${data.action.toUpperCase()}`, reportId, {
      previousStatus: report.status,
      newStatus,
      targetId: report.targetId,
      targetType: report.targetType,
      reason: report.reason,
      actionTaken: data.actionTaken,
      notes: data.notes
    });

    // If report is resolved with an action, create moderation log
    if (data.action === 'resolve' && data.actionTaken) {
      await this.createModerationLogFromReport(updatedReport, adminId, data);
    }

    return { success: true, data: updatedReport };
  }

  /**
   * BULK ACTIONS
   */

  async bulkResolveReports(reportIds: string[], resolution: string, adminId: string) {
    const reports = await prisma.report.findMany({
      where: {
        id: { in: reportIds },
        status: ReportStatus.PENDING
      }
    });

    if (reports.length === 0) {
      throw new Error('No pending reports found');
    }

    await prisma.report.updateMany({
      where: { id: { in: reportIds } },
      data: {
        status: ReportStatus.RESOLVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        resolution
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'REPORTS_BULK_RESOLVED', null, {
      reportIds,
      count: reports.length,
      resolution
    });

    return {
      success: true,
      message: `Resolved ${reports.length} reports`,
      resolvedCount: reports.length
    };
  }

  async bulkDismissReports(reportIds: string[], reason: string, adminId: string) {
    const reports = await prisma.report.findMany({
      where: {
        id: { in: reportIds },
        status: ReportStatus.PENDING
      }
    });

    if (reports.length === 0) {
      throw new Error('No pending reports found');
    }

    await prisma.report.updateMany({
      where: { id: { in: reportIds } },
      data: {
        status: ReportStatus.DISMISSED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        resolution: reason
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'REPORTS_BULK_DISMISSED', null, {
      reportIds,
      count: reports.length,
      reason
    });

    return {
      success: true,
      message: `Dismissed ${reports.length} reports`,
      dismissedCount: reports.length
    };
  }

  /**
   * ESCALATE REPORT
   */

  async escalateReport(reportId: string, escalationReason: string, adminId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.ESCALATED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        resolution: escalationReason,
        escalatedAt: new Date()
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'REPORT_ESCALATED', reportId, {
      previousStatus: report.status,
      escalationReason,
      targetId: report.targetId,
      targetType: report.targetType,
      reason: report.reason
    });

    return { success: true, data: updatedReport };
  }

  /**
   * REPORT ANALYTICS
   */

  async getReportAnalytics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<ReportAnalytics> {
    const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalReports,
      resolvedReports,
      pendingReports,
      escalatedReports,
      dismissedReports,
      reportsByReason,
      reportsByTargetType,
      reportsBySeverity,
      avgResolutionTime
    ] = await Promise.all([
      prisma.report.count({ where: { createdAt: { gte: startDate } } }),
      prisma.report.count({
        where: {
          createdAt: { gte: startDate },
          status: ReportStatus.RESOLVED
        }
      }),
      prisma.report.count({
        where: {
          createdAt: { gte: startDate },
          status: ReportStatus.PENDING
        }
      }),
      prisma.report.count({
        where: {
          createdAt: { gte: startDate },
          status: ReportStatus.ESCALATED
        }
      }),
      prisma.report.count({
        where: {
          createdAt: { gte: startDate },
          status: ReportStatus.DISMISSED
        }
      }),
      this.getReportsByReason(startDate),
      this.getReportsByTargetType(startDate),
      this.getReportsBySeverity(startDate),
      this.getAverageResolutionTime(startDate)
    ]);

    return {
      totalReports,
      resolvedReports,
      pendingReports,
      escalatedReports,
      dismissedReports,
      reportsByReason,
      reportsByTargetType,
      reportsBySeverity,
      averageResolutionTime: avgResolutionTime
    };
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private async verifyTargetExists(targetId: string, targetType: string) {
    switch (targetType) {
      case 'post':
        const post = await prisma.post.findUnique({ where: { id: targetId } });
        if (!post) throw new Error('Post not found');
        break;
      case 'comment':
        const comment = await prisma.comment.findUnique({ where: { id: targetId } });
        if (!comment) throw new Error('Comment not found');
        break;
      case 'user':
        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) throw new Error('User not found');
        if (!user.isActive) throw new Error('Cannot report inactive user');
        break;
      case 'message':
        const message = await prisma.message.findUnique({ where: { id: targetId } });
        if (!message) throw new Error('Message not found');
        break;
      default:
        throw new Error('Invalid target type');
    }
  }

  private determineSeverity(reason: ReportReason): 'low' | 'medium' | 'high' | 'critical' {
    switch (reason) {
      case ReportReason.SPAM:
      case ReportReason.OFF_TOPIC:
        return 'low';
      case ReportReason.INAPPROPRIATE:
      case ReportReason.HARASSMENT:
        return 'medium';
      case ReportReason.HATE_SPEECH:
      case ReportReason.THREAT:
        return 'high';
      case ReportReason.ILLEGAL_CONTENT:
      case ReportReason.VIOLENCE:
        return 'critical';
      default:
        return 'medium';
    }
  }

  private async createModerationLogFromReport(report: any, adminId: string, reviewData: ReviewReportRequest) {
    await prisma.moderationLog.create({
      data: {
        action: reviewData.actionTaken!,
        targetType: report.targetType,
        targetId: report.targetId,
        moderatorId: adminId,
        reason: report.reason,
        notes: `Resolved from report #${report.id}: ${reviewData.notes || ''}`,
        metadata: {
          reportId: report.id,
          resolution: reviewData.resolution,
          evidenceUrls: report.evidenceUrls
        }
      }
    });
  }

  private async getReportsByReason(startDate: Date) {
    const results = await prisma.report.groupBy({
      by: ['reason'],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    return results.reduce((acc, item) => {
      acc[item.reason] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getReportsByTargetType(startDate: Date) {
    const results = await prisma.report.groupBy({
      by: ['targetType'],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    return results.reduce((acc, item) => {
      acc[item.targetType] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getReportsBySeverity(startDate: Date) {
    const results = await prisma.report.groupBy({
      by: ['severity'],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    return results.reduce((acc, item) => {
      acc[item.severity] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getAverageResolutionTime(startDate: Date): Promise<number> {
    const resolvedReports = await prisma.report.findMany({
      where: {
        status: ReportStatus.RESOLVED,
        createdAt: { gte: startDate },
        reviewedAt: { not: null }
      },
      select: {
        createdAt: true,
        reviewedAt: true
      }
    });

    if (resolvedReports.length === 0) return 0;

    const totalTime = resolvedReports.reduce((sum, report) => {
      return sum + (report.reviewedAt!.getTime() - report.createdAt.getTime());
    }, 0);

    return totalTime / resolvedReports.length / (1000 * 60 * 60); // Convert to hours
  }
}

export const reportsService = new ReportsService();