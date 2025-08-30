import { Response } from 'express';
import { BaseController } from './baseController';
import { moderationService } from '../services/moderationService';
import { AdminRequest } from '../middleware/admin';
import { AuthRequest } from '../middleware/auth';
import { ModerationAction } from '@prisma/client';
import { reportManagementService } from '../../../../../packages/moderation/src/services/reportManagement';

class ModerationController extends BaseController {
  /**
   * GET /api/moderation/dashboard
   * Get moderation dashboard data (admin/mod only)
   */
  async getDashboard(req: AdminRequest, res: Response) {
    try {
      const dashboard = await moderationService.getModerationDashboard();
      this.sendSuccess(res, dashboard);
    } catch (error: any) {
      console.error('Failed to get moderation dashboard:', error);
      if (error.code === 'P1001') {
        this.sendError(res, 'Database connection error', 503);
      } else if (error.message?.includes('permission')) {
        this.sendError(res, 'Insufficient permissions', 403);
      } else {
        this.sendError(res, 'Failed to get moderation dashboard', 500);
      }
    }
  }

  /**
   * POST /api/moderation/check-content
   * Check content against moderation filters (public endpoint for client-side checks)
    */
   async checkContent(req: AuthRequest, res: Response) {
     try {
       const { content } = req.body;
       const result = await moderationService.checkContentFilters(content);
       this.sendSuccess(res, result);
     } catch (error: any) {
       console.error('Failed to check content:', error);
       if (error.message?.includes('content too long')) {
         this.sendError(res, 'Content exceeds maximum allowed length', 413);
       } else if (error.message?.includes('unsupported content')) {
         this.sendError(res, 'Unsupported content type', 415);
       } else if (error.code === 'SERVICE_TIMEOUT') {
         this.sendError(res, 'Content moderation service temporarily unavailable', 503);
       } else {
         this.sendError(res, 'Failed to check content', 500);
       }
     }
   }

  /**
   * POST /api/moderation/auto-check
   * Process content through auto-moderation
    */
   async autoModerationCheck(req: AuthRequest, res: Response) {
     try {
       const { content, contentType, metadata } = req.body;
       const result = await moderationService.processContentAutoModeration(
         content,
         contentType,
         req.user.id,
         metadata
       );

      this.sendSuccess(res, result);
    } catch (error: any) {
      console.error('Failed to process auto-moderation:', error);
      this.sendError(res, 'Failed to process content moderation', 500);
    }
  }

  /**
   * POST /api/moderation/moderate
   * Moderate specific content (admin/mod only)
    */
   async moderateContent(req: AdminRequest, res: Response) {
     try {
         const { targetId, targetType, action, reason, notes, duration } = req.body;
         if (!req.admin) {
           return this.sendError(res, 'Admin authentication required', 401);
         }
         const result = await moderationService.moderateContent(
           targetId,
           targetType,
           req.admin.id,
           { action, reason, notes, duration }
         );
 
       this.sendSuccess(res, result);
     } catch (error: any) {
       const { targetId, targetType } = req.body;
       console.error(`Failed to moderate ${targetType} (${targetId}):`, error);
 
       if (error.message?.includes('not found')) {
         this.sendError(res, `${targetType} not found`, 404);
       } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
         this.sendError(res, 'Insufficient permissions to moderate this content', 403);
       } else if (error.message?.includes('already') && error.message?.includes('moderated')) {
         this.sendError(res, 'Content has already been moderated', 409);
       } else if (error.code === 'P2025') {
         this.sendError(res, 'Target content not found', 404);
       } else if (error.code === 'P2002') {
         this.sendError(res, 'Moderation action already exists', 409);
       } else {
         this.sendError(res, 'Failed to moderate content', 500);
       }
     }
   }

  /**
   * POST /api/moderation/bulk
   * Bulk moderate multiple items (admin/mod only)
    */
   async bulkModerate(req: AdminRequest, res: Response) {
     try {
         const { targetIds, targetType, action, reason, notes, duration } = req.body;
 
         if (!req.admin) {
           return this.sendError(res, 'Admin authentication required', 401);
         }
 
         const result = await moderationService.bulkModerateContent(
           req.admin.id,
           { targetIds, targetType, action, reason, notes, duration }
         );
 
       // Check if there were any partial failures
       if (result.failed > 0) {
         this.sendSuccess(res, {
           ...result,
           message: `Bulk moderation completed with ${result.failed} failures`
         }, 207); // 207 Multi-Status
       } else {
         this.sendSuccess(res, result);
       }
     } catch (error: any) {
       console.error('Failed to bulk moderate content:', error);
 
       if (error.message?.includes('limit') && error.message?.includes('exceeded')) {
         this.sendError(res, 'Bulk operation limit exceeded', 413);
       } else if (error.message?.includes('timeout')) {
         this.sendError(res, 'Bulk operation timed out', 504);
       } else if (error.code === 'SERVICE_OVERLOAD') {
         this.sendError(res, 'Service temporarily overloaded, try again later', 503);
       } else {
         this.sendError(res, 'Failed to bulk moderate content', 500);
       }
     }
   }

  /**
   * GET /api/moderation/stats
   * Get moderation statistics (admin/mod only)
    */
   async getStats(req: AdminRequest, res: Response) {
     try {
       const { timeframe = 'week' } = req.query;
       const stats = await moderationService.getModerationStats(timeframe as any);
      this.sendSuccess(res, stats);
    } catch (error: any) {
      console.error('Failed to get moderation stats:', error);
      this.sendError(res, 'Failed to get moderation statistics', 500);
    }
  }

  // Content Filter Management

  /**
   * GET /api/moderation/filters
   * Get all content filters (admin/mod only)
   */
  async getContentFilters(req: AdminRequest, res: Response) {
    try {
      const { activeOnly = false } = req.query;
      const filters = await moderationService.getContentFilters(activeOnly === 'true');
      this.sendSuccess(res, filters);
    } catch (error: any) {
      console.error('Failed to get content filters:', error);
      this.sendError(res, 'Failed to get content filters', 500);
    }
  }

  /**
   * POST /api/moderation/filters
   * Create a new content filter (admin only)
    */
   async createContentFilter(req: AdminRequest, res: Response) {
     try {
       const { name, type, pattern, severity, action } = req.body;
       if (!req.admin) {
         return this.sendError(res, 'Admin authentication required', 401);
       }

       const filter = await moderationService.createContentFilter({
         name,
         type,
         pattern,
         severity,
         action,
         createdBy: req.admin.id
       });
 
       this.sendSuccess(res, filter, 201);
     } catch (error: any) {
       console.error('Failed to create content filter:', error);
 
       if (error.message?.includes('already exists')) {
         this.sendError(res, 'Content filter with this name already exists', 409);
       } else if (error.message?.includes('invalid pattern')) {
         this.sendError(res, 'Invalid filter pattern provided', 400);
       } else if (error.code === 'P2002') {
         this.sendError(res, 'Content filter with this configuration already exists', 409);
       } else if (error.code === 'VALIDATION_ERROR') {
         this.sendError(res, 'Filter validation failed', 400);
       } else {
         this.sendError(res, 'Failed to create content filter', 500);
       }
     }
   }

  /**
   * PUT /api/moderation/filters/:id
   * Update a content filter (admin only)
   */
  async updateContentFilter(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, pattern, severity, action, isActive } = req.body;

      if (!id) {
        return this.sendError(res, 'Filter ID is required', 400);
      }

      if (!req.admin) {
        return this.sendError(res, 'Admin authentication required', 401);
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (type !== undefined) updates.type = type;
      if (pattern !== undefined) updates.pattern = pattern;
      if (severity !== undefined) updates.severity = severity;
      if (action !== undefined) updates.action = action;
      if (isActive !== undefined) updates.isActive = isActive;

      const filter = await moderationService.updateContentFilter(id, updates, req.admin.id);
      this.sendSuccess(res, filter);
    } catch (error: any) {
      console.error('Failed to update content filter:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'Content filter not found', 404);
      }
      this.sendError(res, error.message || 'Failed to update content filter', 500);
    }
  }

  /**
   * DELETE /api/moderation/filters/:id
   * Delete a content filter (admin only)
   */
  async deleteContentFilter(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return this.sendError(res, 'Filter ID is required', 400);
      }

      if (!req.admin) {
        return this.sendError(res, 'Admin authentication required', 401);
      }

      await moderationService.deleteContentFilter(id, req.admin.id);
      this.sendSuccess(res, { message: 'Content filter deleted successfully' });
    } catch (error: any) {
      console.error('Failed to delete content filter:', error);
      if (error.code === 'P2025') {
        return this.sendError(res, 'Content filter not found', 404);
      }
      this.sendError(res, error.message || 'Failed to delete content filter', 500);
    }
  }

  // Report Management

  /**
   * POST /api/moderation/reports
   * Create a new report (authenticated endpoint)
    */
   async createReport(req: AuthRequest, res: Response) {
     try {
       const { targetType, targetId, reason, description } = req.body;
       const report = await reportManagementService.createReport({
         reporterId: req.user.id,
         targetType,
         targetId,
         reason,
         description
       });
 
       this.sendSuccess(res, report, 201);
     } catch (error: any) {
       const { targetType, targetId } = req.body;
       console.error(`Failed to create report for ${targetType} (${targetId}):`, error);
 
       if (error.message?.includes('already reported')) {
         this.sendError(res, 'You have already reported this content', 409);
       } else if (error.message?.includes('not found')) {
         this.sendError(res, 'Content to report not found', 404);
       } else if (error.message?.includes('cannot report yourself')) {
         this.sendError(res, 'You cannot report your own content', 403);
       } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
         this.sendError(res, 'Report rate limit exceeded, please try again later', 429);
       } else if (error.code === 'SERVICE_UNAVAILABLE') {
         this.sendError(res, 'Report service temporarily unavailable', 503);
       } else {
         this.sendError(res, 'Failed to create report', 500);
       }
     }
   }

  /**
   * GET /api/moderation/reports
   * Get reports (admin/mod only)
   */
  async getReports(req: AdminRequest, res: Response) {
    try {
      const { status, targetType, severity, limit = 20, offset = 0 } = req.query;

      let reports;
      if (status === 'pending' || !status) {
        reports = await reportManagementService.getPendingReports({
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          targetType: targetType as string,
          severity: severity as any
        });
      } else {
        // For other statuses, we would need additional methods in the service
        // For now, return an empty array for other statuses
        reports = [];
      }

      this.sendSuccess(res, reports);
    } catch (error: any) {
      console.error('Failed to get reports:', error);
      this.sendError(res, 'Failed to get reports', 500);
    }
  }

  /**
   * POST /api/moderation/reports/:id/review
   * Review and resolve a report (admin/mod only)
    */
   async reviewReport(req: AdminRequest, res: Response) {
     try {
       const { id } = req.params;
       const { decision, resolution } = req.body;

       if (!id) {
         return this.sendError(res, 'Report ID is required', 400);
       }

       if (!req.admin) {
         return this.sendError(res, 'Admin authentication required', 401);
       }

       const result = await reportManagementService.reviewReport(
         id,
         req.admin.id,
         decision,
         resolution
       );
 
       this.sendSuccess(res, result);
     } catch (error: any) {
       const { id } = req.params;
       console.error(`Failed to review report ${id}:`, error);
 
       if (error.message?.includes('not found')) {
         this.sendError(res, 'Report not found', 404);
       } else if (error.message?.includes('already reviewed') || error.message?.includes('already resolved')) {
         this.sendError(res, 'Report has already been reviewed', 409);
       } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
         this.sendError(res, 'Insufficient permissions to review this report', 403);
       } else if (error.code === 'INVALID_STATE_TRANSITION') {
         this.sendError(res, 'Invalid state transition for this report', 400);
       } else {
         this.sendError(res, 'Failed to review report', 500);
       }
     }
   }

  /**
   * GET /api/moderation/report-stats
   * Get report statistics (admin only)
    */
   async getReportStats(req: AdminRequest, res: Response) {
     try {
       const { timeframe = 'week' } = req.query;
       const stats = await reportManagementService.getReportStatistics(timeframe as any);
      this.sendSuccess(res, stats);
    } catch (error: any) {
      console.error('Failed to get report statistics:', error);
      this.sendError(res, 'Failed to get report statistics', 500);
    }
  }
}

export const moderationController = new ModerationController();