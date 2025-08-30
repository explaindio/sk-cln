import { prisma } from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';
import { ExperimentStatus, SegmentType } from '@prisma/client';

// Interfaces for service methods
interface CreateFeatureFlagRequest {
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
    type: SegmentType;
    conditions: any;
    priority?: number;
  }>;
}

interface UpdateFeatureFlagRequest {
  name?: string;
  description?: string;
  value?: any;
  defaultValue?: any;
  isActive?: boolean;
  rolloutPercentage?: number;
  userIds?: string[];
  conditions?: any;
}

interface CreateExperimentRequest {
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

interface FeatureFlagAnalytics {
  totalUsages: number;
  uniqueUsers: number;
  conversionRate?: number;
  variantPerformance?: Array<{
    variant: string;
    usages: number;
    conversionRate?: number;
  }>;
  usageOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export class FeatureFlagsService {

  /**
   * FEATURE FLAG CRUD OPERATIONS
   */

  async getFeatureFlags(options?: {
    includeArchived?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      includeArchived = false,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options || {};

    const offset = (page - 1) * limit;
    const where: any = {};
    if (!includeArchived) {
      where.isArchived = false;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [flags, total] = await Promise.all([
      prisma.featureFlag.findMany({
        where,
        include: {
          segments: true,
          experiments: {
            where: { isActive: true }
          },
          _count: {
            select: { usages: true }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.featureFlag.count({ where })
    ]);

    return {
      success: true,
      data: flags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getFeatureFlag(flagId: string) {
    const flag = await prisma.featureFlag.findUnique({
      where: { id: flagId },
      include: {
        segments: true,
        experiments: {
          include: {
            _count: {
              select: { usages: true }
            }
          }
        },
        createdBy: {
          select: { id: true, email: true, username: true }
        },
        updatedBy: {
          select: { id: true, email: true, username: true }
        }
      }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    return { success: true, data: flag };
  }

  async getFeatureFlagByKey(key: string) {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
      include: {
        segments: true,
        experiments: {
          where: { isActive: true },
          include: {
            _count: {
              select: { usages: true }
            }
          }
        }
      }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    return { success: true, data: flag };
  }

  async createFeatureFlag(data: CreateFeatureFlagRequest, adminId: string) {
    // Validate unique key and name
    const existingFlag = await prisma.featureFlag.findFirst({
      where: {
        OR: [
          { key: data.key },
          { name: data.name }
        ],
        isArchived: false
      }
    });

    if (existingFlag) {
      throw new Error('Feature flag with this key or name already exists');
    }

    const flag = await prisma.featureFlag.create({
      data: {
        name: data.name,
        key: data.key,
        description: data.description,
        value: data.value,
        defaultValue: data.defaultValue,
        rolloutPercentage: data.rolloutPercentage || 100,
        userIds: data.userIds || [],
        conditions: data.conditions,
        createdById: adminId,
        updatedById: adminId,
        segments: data.segments ? {
          create: data.segments.map(segment => ({
            name: segment.name,
            type: segment.type,
            conditions: segment.conditions,
            priority: segment.priority || 0
          }))
        } : undefined
      },
      include: {
        segments: true,
        experiments: true
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'FEATURE_FLAG_CREATED', flag.id, {
      key: flag.key,
      name: flag.name
    });

    return { success: true, data: flag };
  }

  async updateFeatureFlag(flagId: string, data: UpdateFeatureFlagRequest, adminId: string) {
    const flag = await prisma.featureFlag.findUnique({
      where: { id: flagId }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const updatedFlag = await prisma.featureFlag.update({
      where: { id: flagId },
      data: {
        ...data,
        updatedById: adminId,
        updatedAt: new Date()
      },
      include: {
        segments: true,
        experiments: true
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'FEATURE_FLAG_UPDATED', flagId, {
      previousKey: flag.key,
      updatedFields: Object.keys(data)
    });

    return { success: true, data: updatedFlag };
  }

  async deleteFeatureFlag(flagId: string, adminId: string) {
    const flag = await prisma.featureFlag.findUnique({
      where: { id: flagId }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    // Soft delete by archiving
    await prisma.featureFlag.update({
      where: { id: flagId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        updatedById: adminId
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'FEATURE_FLAG_ARCHIVED', flagId, {
      key: flag.key,
      name: flag.name
    });

    return { success: true, message: 'Feature flag archived successfully' };
  }

  /**
   * FEATURE ACTIVATION/DEACTIVATION
   */

  async toggleFeatureFlag(flagId: string, isActive: boolean, adminId: string) {
    const flag = await prisma.featureFlag.findUnique({
      where: { id: flagId }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const updatedFlag = await prisma.featureFlag.update({
      where: { id: flagId },
      data: {
        isActive,
        updatedById: adminId,
        updatedAt: new Date()
      }
    });

    // Log admin action
    await logAdminAction(adminId, `FEATURE_FLAG_${isActive ? 'ENABLED' : 'DISABLED'}`, flagId, {
      key: flag.key,
      name: flag.name
    });

    return { success: true, data: updatedFlag };
  }

  /**
   * A/B TESTING EXPERIMENT MANAGEMENT
   */

  async getExperiments(featureFlagId?: string) {
    const experiments = await prisma.aBExperiment.findMany({
      where: featureFlagId ? { featureFlagId } : undefined,
      include: {
        featureFlag: {
          select: { id: true, name: true, key: true }
        },
        createdBy: {
          select: { id: true, email: true, username: true }
        },
        _count: {
          select: { usages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: experiments };
  }

  async createExperiment(data: CreateExperimentRequest, adminId: string) {
    // Validate feature flag exists and is not archived
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { id: data.featureFlagId }
    });

    if (!featureFlag) {
      throw new Error('Feature flag not found');
    }

    if (featureFlag.isArchived) {
      throw new Error('Cannot create experiment for archived feature flag');
    }

    // Validate variant percentages sum to 100
    const totalPercentage = data.variants.reduce((sum, variant) => sum + variant.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Variant percentages must sum to 100');
    }

    const experiment = await prisma.aBExperiment.create({
      data: {
        name: data.name,
        description: data.description,
        featureFlagId: data.featureFlagId,
        variants: data.variants,
        targetAudience: data.targetAudience,
        startDate: data.startDate,
        endDate: data.endDate,
        metrics: data.metrics,
        createdById: adminId
      },
      include: {
        featureFlag: {
          select: { id: true, name: true, key: true }
        },
        createdBy: {
          select: { id: true, email: true, username: true }
        }
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'EXPERIMENT_CREATED', experiment.id, {
      name: experiment.name,
      featureFlagKey: featureFlag.key
    });

    return { success: true, data: experiment };
  }

  async updateExperimentStatus(experimentId: string, status: ExperimentStatus, adminId: string) {
    const experiment = await prisma.aBExperiment.findUnique({
      where: { id: experimentId },
      include: { featureFlag: true }
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const updatedExperiment = await prisma.aBExperiment.update({
      where: { id: experimentId },
      data: {
        status,
        ...(status === 'RUNNING' && !experiment.startDate ? { startDate: new Date() } : {}),
        ...(status === 'COMPLETED' && !experiment.endDate ? { endDate: new Date() } : {})
      }
    });

    // Log admin action
    await logAdminAction(adminId, `EXPERIMENT_${status}`, experimentId, {
      name: experiment.name,
      featureFlagKey: experiment.featureFlag.key
    });

    return { success: true, data: updatedExperiment };
  }

  /**
   * USER SEGMENTATION
   */

  async addSegment(featureFlagId: string, segmentData: {
    name: string;
    type: SegmentType;
    conditions: any;
    priority?: number;
  }, adminId: string) {
    const segment = await prisma.featureSegment.create({
      data: {
        featureFlagId,
        name: segmentData.name,
        type: segmentData.type,
        conditions: segmentData.conditions,
        priority: segmentData.priority || 0
      }
    });

    // Log admin action
    await logAdminAction(adminId, 'SEGMENT_CREATED', segment.id, {
      featureFlagId,
      name: segment.name,
      type: segment.type
    });

    return { success: true, data: segment };
  }

  async updateSegment(segmentId: string, updates: Partial<{
    name: string;
    type: SegmentType;
    conditions: any;
    priority: number;
    isActive: boolean;
  }>, adminId: string) {
    const segment = await prisma.featureSegment.update({
      where: { id: segmentId },
      data: updates
    });

    // Log admin action
    await logAdminAction(adminId, 'SEGMENT_UPDATED', segmentId, updates);

    return { success: true, data: segment };
  }

  async deleteSegment(segmentId: string, adminId: string) {
    const segment = await prisma.featureSegment.findUnique({
      where: { id: segmentId },
      include: { featureFlag: true }
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    await prisma.featureSegment.delete({
      where: { id: segmentId }
    });

    // Log admin action
    await logAdminAction(adminId, 'SEGMENT_DELETED', segmentId, {
      featureFlagKey: segment.featureFlag.key,
      name: segment.name
    });

    return { success: true, message: 'Segment deleted successfully' };
  }

  /**
   * FEATURE EVALUATION
   */

  async evaluateFeatureFlag(key: string, userId?: string, context?: { userAgent?: string; ipAddress?: string; }) {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
      include: {
        segments: { where: { isActive: true }, orderBy: { priority: 'desc' } },
        experiments: { where: { isActive: true, status: 'RUNNING' } }
      }
    });

    if (!flag || flag.isArchived) {
      return { success: true, enabled: false, value: null, reason: 'Flag not found or archived' };
    }

    // Check if feature is completely disabled
    if (!flag.isActive) {
      return { success: true, enabled: false, value: flag.defaultValue, reason: 'Flag disabled' };
    }

    // Check direct user targeting
    if (userId && flag.userIds.includes(userId)) {
      return { success: true, enabled: true, value: flag.value, reason: 'Direct targeting' };
    }

    // Check segmentation rules
    for (const segment of flag.segments) {
      if (this.evaluateSegment(segment.conditions, userId, context)) {
        return { success: true, enabled: true, value: flag.value, reason: `Segment: ${segment.name}`, segment };
      }
    }

    // Check rollout percentage
    if (userId) {
      const hash = this.simpleHash(userId + flag.id);
      const rolloutBucket = (hash % 100) / 100;
      if (rolloutBucket <= (flag.rolloutPercentage / 100)) {
        return { success: true, enabled: true, value: flag.value, reason: 'Rollout percentage' };
      }
    }

    // Check if user is in active experiment
    if (userId && flag.experiments.length > 0) {
      for (const experiment of flag.experiments) {
        const experimentVariant = this.getExperimentVariant(experiment, userId);
        if (experimentVariant) {
          return {
            success: true,
            enabled: true,
            value: experimentVariant.value,
            reason: `Experiment: ${experiment.name}`,
            experiment,
            variant: experimentVariant
          };
        }
      }
    }

    // Default behavior
    return {
      success: true,
      enabled: false,
      value: flag.defaultValue,
      reason: 'Default rule'
    };
  }

  async recordUsage(key: string, userId: string, variant?: string, metadata?: any, context?: {
    userAgent?: string;
    ipAddress?: string;
  }) {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
      include: { experiments: { where: { isActive: true, status: 'RUNNING' } } }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    let experimentId: string | undefined;
    if (variant && flag.experiments.length > 0) {
      for (const experiment of flag.experiments) {
        const validVariants = experiment.variants as Array<{ name: string; value: any }>;
        if (validVariants.some(v => v.name === variant)) {
          experimentId = experiment.id;
          break;
        }
      }
    }

    await prisma.featureUsage.create({
      data: {
        userId,
        featureFlagId: flag.id,
        experimentId,
        variant,
        action: metadata?.action || 'view',
        metadata,
        sessionId: metadata?.sessionId,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        timestamp: new Date()
      }
    });

    return { success: true };
  }

  /**
   * ANALYTICS AND REPORTING
   */

  async getFeatureFlagAnalytics(key: string, dateRange?: { start: Date; end: Date }): Promise<FeatureFlagAnalytics> {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
      include: { experiments: { include: { usages: true } } }
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const dateFilter = dateRange ? {
      timestamp: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    } : {};

    const usages = await prisma.featureUsage.findMany({
      where: {
        featureFlagId: flag.id,
        ...dateFilter
      },
      include: { experiment: true }
    });

    const totalUsages = usages.length;
    const uniqueUsers = new Set(usages.map(u => u.userId)).size;

    // Calculate usage over time
    const dailyUsages = usages.reduce((acc, usage) => {
      const date = usage.timestamp.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const usageOverTime = Object.entries(dailyUsages)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Experiment variant performance
    const variantPerformance: Array<{ variant: string; usages: number; conversionRate?: number }> = [];
    if (flag.experiments.length > 0) {
      for (const experiment of flag.experiments) {
        const experimentUsages = usages.filter(u => u.experimentId === experiment.id);
        if (experiment.variants && Array.isArray(experiment.variants)) {
          experiment.variants.forEach((variant: any) => {
            const variantUsages = experimentUsages.filter(u => u.variant === variant.name);
            variantPerformance.push({
              variant: variant.name,
              usages: variantUsages.length,
              conversionRate: 0 // TODO: implement when we have conversion events
            });
          });
        }
      }
    }

    return {
      totalUsages,
      uniqueUsers,
      conversionRate: 0, // TODO: implement when we have conversion events
      variantPerformance,
      usageOverTime
    };
  }

  async getExperimentAnalytics(experimentId: string): Promise<{
    totalParticipants: number;
    variantDistribution: Array<{ variant: string; count: number; percentage: number }>;
    metrics: Array<{ name: string; type: 'primary' | 'secondary'; data: any }>;
  }> {
    const experiment = await prisma.aBExperiment.findUnique({
      where: { id: experimentId },
      include: { usages: true }
    });

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const variantCounts = experiment.usages.reduce((acc, usage) => {
      if (usage.variant) {
        acc[usage.variant] = (acc[usage.variant] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalParticipants = experiment.usages.length;
    const variantDistribution = Object.entries(variantCounts).map(([variant, count]) => ({
      variant,
      count,
      percentage: totalParticipants > 0 ? (count / totalParticipants) * 100 : 0
    }));

    return {
      totalParticipants,
      variantDistribution,
      metrics: [] // TODO: implement when we have metrics data
    };
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private evaluateSegment(conditions: any, userId?: string, context?: any): boolean {
    try {
      // Simple rule evaluation - can be extended with a more complex rules engine
      if (!conditions) return false;

      // Example conditions might be:
      // { "rule": "userType", "value": ["premium", "admin"] }
      // { "rule": "deviceType", "value": ["mobile", "tablet"] }
      // etc.

      return true; // TODO: implement proper rule evaluation
    } catch (error) {
      console.error('Error evaluating segment:', error);
      return false;
    }
  }

  private getExperimentVariant(experiment: any, userId: string): { name: string; value: any } | null {
    if (!experiment.variants || !Array.isArray(experiment.variants)) {
      return null;
    }

    const hash = this.simpleHash(userId + experiment.id);
    const totalWeight = experiment.variants.reduce((sum: number, variant: any) => sum + (variant.percentage || 0), 0);

    if (totalWeight === 0) return null;

    let cumulativeWeight = 0;
    const randomValue = (hash % 100) / 100;

    for (const variant of experiment.variants) {
      cumulativeWeight += (variant.percentage || 0) / totalWeight;
      if (randomValue <= cumulativeWeight) {
        return {
          name: variant.name,
          value: variant.value
        };
      }
    }

    return null;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const featureFlagsService = new FeatureFlagsService();