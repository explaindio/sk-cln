import { Request } from 'express';
import { BaseController } from '../baseController';
import { featureFlagsService } from '../../services/admin/featureFlags.service';
import { AdminRequest } from '../../middleware/admin';
import { prisma } from '../../lib/prisma';
import { ExperimentStatus, SegmentType } from '@prisma/client';

// Request interfaces for validation
interface CreateFeatureFlagRequestData {
  name: string;
  key: string;
  description?: string;
  value: any;
  defaultValue: any;
  rolloutPercentage?: number;
  userIds?: string[];
  conditions?: any;
  segments?: Array<{
    name: string;
    type: string;
    conditions: any;
    priority?: number;
  }>;
}

interface UpdateFeatureFlagRequestData {
  name?: string;
  description?: string;
  value?: any;
  defaultValue?: any;
  isActive?: boolean;
  rolloutPercentage?: number;
  userIds?: string[];
  conditions?: any;
}

interface CreateExperimentRequestData {
  name: string;
  description?: string;
  featureFlagId: string;
  variants: Array<{
    name: string;
    value: any;
    percentage: number;
  }>;
  targetAudience?: string;
  startDate?: Date;
  endDate?: Date;
  metrics?: Array<{
    name: string;
    type: 'primary' | 'secondary';
  }>;
}

interface CreateSegmentRequestData {
  name: string;
  type: string;
  conditions: any;
  priority?: number;
}

class FeatureFlagsController extends BaseController {

  /**
   * FEATURE FLAG CRUD OPERATIONS
   */

  /**
   * GET /api/admin/feature-flags
   * Get paginated list of feature flags
   */
  async getFeatureFlags(req: AdminRequest, res: Response) {
    try {
      const {
        includeArchived = 'false',
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        includeArchived: includeArchived === 'true',
        page: parseInt(page as string, 10) || 1,
        limit: Math.min(parseInt(limit as string, 10) || 20, 100), // Max 100 per page
        sortBy: sortBy as string,
        sortOrder: (sortOrder as string).toLowerCase() as 'asc' | 'desc'
      };

      const result = await featureFlagsService.getFeatureFlags(options);
      return this.sendSuccess(res, result.data, undefined, result.pagination);
    } catch (error: any) {
      console.error('Failed to get feature flags:', error);
      this.sendError(res, 'Failed to fetch feature flags', 500);
    }
  }

  /**
   * GET /api/admin/feature-flags/:flagId
   * Get detailed feature flag information
   */
  async getFeatureFlag(req: AdminRequest, res: Response) {
    try {
      const { flagId } = req.params;

      if (!flagId) {
        return this.sendError(res, 'Feature flag ID is required', 400);
      }

      const result = await featureFlagsService.getFeatureFlag(flagId);
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to get feature flag:', error);
      if (error.message === 'Feature flag not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to fetch feature flag', 500);
    }
  }

  /**
   * GET /api/admin/feature-flags/key/:key
   * Get feature flag by key
   */
  async getFeatureFlagByKey(req: AdminRequest, res: Response) {
    try {
      const { key } = req.params;

      if (!key) {
        return this.sendError(res, 'Feature flag key is required', 400);
      }

      const result = await featureFlagsService.getFeatureFlagByKey(key);
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to get feature flag by key:', error);
      if (error.message === 'Feature flag not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to fetch feature flag', 500);
    }
  }

  /**
   * POST /api/admin/feature-flags
   * Create a new feature flag
   */
  async createFeatureFlag(req: AdminRequest, res: Response) {
    try {
      const data: CreateFeatureFlagRequestData = req.body;

      // Validation
      if (!data.name || !data.key || data.value === undefined || data.defaultValue === undefined) {
        return this.sendError(res, 'Name, key, value, and defaultValue are required', 400);
      }

      // Validate key format (alphanumeric, hyphens, underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(data.key)) {
        return this.sendError(res, 'Feature flag key can only contain letters, numbers, hyphens, and underscores', 400);
      }

      // Validate rollout percentage
      if (data.rolloutPercentage !== undefined && (data.rolloutPercentage < 0 || data.rolloutPercentage > 100)) {
        return this.sendError(res, 'Rollout percentage must be between 0 and 100', 400);
      }

      // Validate segments
      if (data.segments) {
        for (const segment of data.segments) {
          if (!segment.name || !segment.type || !segment.conditions) {
            return this.sendError(res, 'Segment must have name, type, and conditions', 400);
          }
          if (!Object.values(SegmentType).includes(segment.type as SegmentType)) {
            return this.sendError(res, `Invalid segment type: ${segment.type}`, 400);
          }
        }
      }

      const result = await featureFlagsService.createFeatureFlag(data, req.admin.id);
      return this.sendSuccess(res, result.data, 201);
    } catch (error: any) {
      console.error('Failed to create feature flag:', error);
      if (error.message.includes('already exists')) {
        return this.sendError(res, error.message, 409);
      }
      this.sendError(res, 'Failed to create feature flag', 500);
    }
  }

  /**
   * PUT /api/admin/feature-flags/:flagId
   * Update a feature flag
   */
  async updateFeatureFlag(req: AdminRequest, res: Response) {
    try {
      const { flagId } = req.params;
      const data: UpdateFeatureFlagRequestData = req.body;

      if (!flagId) {
        return this.sendError(res, 'Feature flag ID is required', 400);
      }

      // Validate rollout percentage if provided
      if (data.rolloutPercentage !== undefined && (data.rolloutPercentage < 0 || data.rolloutPercentage > 100)) {
        return this.sendError(res, 'Rollout percentage must be between 0 and 100', 400);
      }

      // Remove undefined values to prevent overwriting with null
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      const result = await featureFlagsService.updateFeatureFlag(flagId, data, req.admin.id);
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to update feature flag:', error);
      if (error.message === 'Feature flag not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to update feature flag', 500);
    }
  }

  /**
   * DELETE /api/admin/feature-flags/:flagId
   * Delete (archive) a feature flag
   */
  async deleteFeatureFlag(req: AdminRequest, res: Response) {
    try {
      const { flagId } = req.params;

      if (!flagId) {
        return this.sendError(res, 'Feature flag ID is required', 400);
      }

      const result = await featureFlagsService.deleteFeatureFlag(flagId, req.admin.id);
      return this.sendSuccess(res, result);
    } catch (error: any) {
      console.error('Failed to delete feature flag:', error);
      if (error.message === 'Feature flag not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to delete feature flag', 500);
    }
  }

  /**
   * FEATURE ACTIVATION/DEACTIVATION
   */

  /**
   * PATCH /api/admin/feature-flags/:flagId/toggle
   * Toggle feature flag active status
   */
  async toggleFeatureFlag(req: AdminRequest, res: Response) {
    try {
      const { flagId } = req.params;
      const { isActive } = req.body;

      if (!flagId) {
        return this.sendError(res, 'Feature flag ID is required', 400);
      }

      if (typeof isActive !== 'boolean') {
        return this.sendError(res, 'isActive must be a boolean', 400);
      }

      const result = await featureFlagsService.toggleFeatureFlag(flagId, isActive, req.admin.id);
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to toggle feature flag:', error);
      if (error.message === 'Feature flag not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to toggle feature flag', 500);
    }
  }

  /**
   * A/B TESTING EXPERIMENT MANAGEMENT
   */

  /**
   * GET /api/admin/feature-flags/experiments
   * Get all experiments
   */
  async getExperiments(req: AdminRequest, res: Response) {
    try {
      const { featureFlagId } = req.query;
      const result = await featureFlagsService.getExperiments(featureFlagId as string);
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to get experiments:', error);
      this.sendError(res, 'Failed to fetch experiments', 500);
    }
  }

  /**
   * POST /api/admin/feature-flags/experiments
   * Create a new experiment
   */
  async createExperiment(req: AdminRequest, res: Response) {
    try {
      const data: CreateExperimentRequestData = req.body;

      // Validation
      if (!data.name || !data.featureFlagId || !data.variants || !Array.isArray(data.variants)) {
        return this.sendError(res, 'Name, featureFlagId, and variants are required. Variants must be an array.', 400);
      }

      if (data.variants.length === 0) {
        return this.sendError(res, 'At least one variant is required', 400);
      }

      // Validate variant percentages
      for (const variant of data.variants) {
        if (!variant.name || variant.value === undefined || variant.percentage === undefined) {
          return this.sendError(res, 'Each variant must have name, value, and percentage', 400);
        }
        if (variant.percentage < 0 || variant.percentage > 100) {
          return this.sendError(res, 'Variant percentage must be between 0 and 100', 400);
        }
      }

      // Parse date strings to Date objects
      if (data.startDate) {
        data.startDate = new Date(data.startDate);
      }
      if (data.endDate) {
        data.endDate = new Date(data.endDate);
      }

      const result = await featureFlagsService.createExperiment(data, req.admin.id);
      return this.sendSuccess(res, result.data, 201);
    } catch (error: any) {
      console.error('Failed to create experiment:', error);
      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }
      if (error.message.includes('sum to 100')) {
        return this.sendError(res, error.message, 400);
      }
      this.sendError(res, 'Failed to create experiment', 500);
    }
  }

  /**
   * PATCH /api/admin/feature-flags/experiments/:experimentId/status
   * Update experiment status
   */
  async updateExperimentStatus(req: AdminRequest, res: Response) {
    try {
      const { experimentId } = req.params;
      const { status } = req.body;

      if (!experimentId) {
        return this.sendError(res, 'Experiment ID is required', 400);
      }

      if (!status || !Object.values(ExperimentStatus).includes(status as ExperimentStatus)) {
        return this.sendError(res, 'Valid status is required', 400);
      }

      const result = await featureFlagsService.updateExperimentStatus(
        experimentId,
        status as ExperimentStatus,
        req.admin.id
      );
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to update experiment status:', error);
      if (error.message === 'Experiment not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to update experiment status', 500);
    }
  }

  /**
   * USER SEGMENTATION
   */

  /**
   * POST /api/admin/feature-flags/:flagId/segments
   * Add a segment to a feature flag
   */
  async addSegment(req: AdminRequest, res: Response) {
    try {
      const { flagId } = req.params;
      const data: CreateSegmentRequestData = req.body;

      if (!flagId) {
        return this.sendError(res, 'Feature flag ID is required', 400);
      }

      // Validation
      if (!data.name || !data.type || !data.conditions) {
        return this.sendError(res, 'Name, type, and conditions are required', 400);
      }

      if (!Object.values(SegmentType).includes(data.type as SegmentType)) {
        return this.sendError(res, `Invalid segment type: ${data.type}`, 400);
      }

      const result = await featureFlagsService.addSegment(flagId, {
        name: data.name,
        type: data.type as SegmentType,
        conditions: data.conditions,
        priority: data.priority || 0
      }, req.admin.id);

      return this.sendSuccess(res, result.data, 201);
    } catch (error: any) {
      console.error('Failed to add segment:', error);
      this.sendError(res, 'Failed to add segment', 500);
    }
  }

  /**
   * PUT /api/admin/feature-flags/segments/:segmentId
   * Update a segment
   */
  async updateSegment(req: AdminRequest, res: Response) {
    try {
      const { segmentId } = req.params;
      const updates = req.body;

      if (!segmentId) {
        return this.sendError(res, 'Segment ID is required', 400);
      }

      // Validate segment type if provided
      if (updates.type && !Object.values(SegmentType).includes(updates.type)) {
        return this.sendError(res, `Invalid segment type: ${updates.type}`, 400);
      }

      const result = await featureFlagsService.updateSegment(segmentId, updates, req.admin.id);
      return this.sendSuccess(res, result.data);
    } catch (error: any) {
      console.error('Failed to update segment:', error);
      this.sendError(res, 'Failed to update segment', 500);
    }
  }

  /**
   * DELETE /api/admin/feature-flags/segments/:segmentId
   * Delete a segment
   */
  async deleteSegment(req: AdminRequest, res: Response) {
    try {
      const { segmentId } = req.params;

      if (!segmentId) {
        return this.sendError(res, 'Segment ID is required', 400);
      }

      const result = await featureFlagsService.deleteSegment(segmentId, req.admin.id);
      return this.sendSuccess(res, result);
    } catch (error: any) {
      console.error('Failed to delete segment:', error);
      if (error.message === 'Segment not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to delete segment', 500);
    }
  }

  /**
   * ANALYTICS AND REPORTING
   */

  /**
   * GET /api/admin/feature-flags/:key/analytics
   * Get feature flag analytics
   */
  async getFeatureFlagAnalytics(req: AdminRequest, res: Response) {
    try {
      const { key } = req.params;
      const { start, end } = req.query;

      if (!key) {
        return this.sendError(res, 'Feature flag key is required', 400);
      }

      const dateRange = start && end ? {
        start: new Date(start as string),
        end: new Date(end as string)
      } : undefined;

      const analytics = await featureFlagsService.getFeatureFlagAnalytics(key, dateRange);
      return this.sendSuccess(res, analytics);
    } catch (error: any) {
      console.error('Failed to get feature flag analytics:', error);
      if (error.message === 'Feature flag not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to fetch analytics', 500);
    }
  }

  /**
   * GET /api/admin/feature-flags/experiments/:experimentId/analytics
   * Get experiment analytics
   */
  async getExperimentAnalytics(req: AdminRequest, res: Response) {
    try {
      const { experimentId } = req.params;

      if (!experimentId) {
        return this.sendError(res, 'Experiment ID is required', 400);
      }

      const analytics = await featureFlagsService.getExperimentAnalytics(experimentId);
      return this.sendSuccess(res, analytics);
    } catch (error: any) {
      console.error('Failed to get experiment analytics:', error);
      if (error.message === 'Experiment not found') {
        return this.sendError(res, error.message, 404);
      }
      this.sendError(res, 'Failed to fetch experiment analytics', 500);
    }
  }

  /**
   * PUBLIC FEATURE EVALUATION (for client-side usage)
   */

  /**
   * GET /api/admin/feature-flags/evaluate/:key
   * Evaluate a feature flag (can be used publicly with proper authentication)
   */
  async evaluateFeatureFlag(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { userId } = req.query;
      const { userAgent, 'x-forwarded-for': ipAddress } = req.headers;

      if (!key) {
        return this.sendError(res, 'Feature flag key is required', 400);
      }

      const result = await featureFlagsService.evaluateFeatureFlag(
        key,
        userId as string,
        { userAgent: userAgent as string, ipAddress: ipAddress as string }
      );
      return this.sendSuccess(res, result);
    } catch (error: any) {
      console.error('Failed to evaluate feature flag:', error);
      this.sendError(res, 'Failed to evaluate feature flag', 500);
    }
  }

  /**
   * POST /api/admin/feature-flags/record-usage
   * Record feature flag usage
   */
  async recordUsage(req: Request, res: Response) {
    try {
      const { key, userId, variant, metadata } = req.body;
      const { userAgent, 'x-forwarded-for': ipAddress } = req.headers;

      if (!key || !userId || !metadata || !metadata.action) {
        return this.sendError(res, 'Key, userId, and metadata with action are required', 400);
      }

      const result = await featureFlagsService.recordUsage(
        key,
        userId,
        variant,
        metadata,
        { userAgent: userAgent as string, ipAddress: ipAddress as string }
      );
      return this.sendSuccess(res, result);
    } catch (error: any) {
      console.error('Failed to record usage:', error);
      this.sendError(res, 'Failed to record usage', 500);
    }
  }
}

export const featureFlagsController = new FeatureFlagsController();