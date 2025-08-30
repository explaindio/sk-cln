import { Response } from 'express';
import * as os from 'os';
import { BaseController } from '../baseController';
import { prisma } from '../../lib/prisma';
import { AdminRequest } from '../../middleware/admin';
import { SystemHealthService } from '../../services/admin/systemHealth.service';

interface HealthCheckFilters {
  includeDetails?: boolean;
  checkServices?: boolean;
  checkPerformance?: boolean;
}

class SystemHealthController extends BaseController {
  private healthService: SystemHealthService;

  constructor() {
    super();
    this.healthService = new SystemHealthService();
  }

  /**
   * GET /api/admin/health/overview
   * Get complete system health overview
   */
  async getHealthOverview(req: AdminRequest, res: Response) {
    try {
      const filters: HealthCheckFilters = {
        includeDetails: req.query.includeDetails === 'true',
        checkServices: req.query.checkServices !== 'false',
        checkPerformance: req.query.checkPerformance !== 'false'
      };

      const healthData = await this.healthService.getSystemHealthOverview();

      // Log the health check action
      await this.logAdminAction(req.admin.id, 'HEALTH_CHECK_OVERVIEW', undefined, {
        overallStatus: healthData.overall,
        filtersApplied: filters
      });

      this.sendSuccess(res, healthData);
    } catch (error: any) {
      console.error('Failed to get health overview:', error);
      await this.logAdminAction(req.admin.id, 'HEALTH_CHECK_ERROR', undefined, {
        error: error.message,
        action: 'HEALTH_OVERVIEW_FAILED'
      });
      this.sendError(res, 'Failed to retrieve system health overview', 500);
    }
  }

  /**
   * GET /api/admin/health/system-metrics
   * Get system metrics (CPU, memory, disk usage)
   */
  async getSystemMetrics(req: AdminRequest, res: Response) {
    try {
      const metrics = await this.healthService.getSystemMetrics();

      await this.logAdminAction(req.admin.id, 'SYSTEM_METRICS_CHECK', undefined, {
        cpuUsage: metrics.cpu.usage,
        memoryUsage: metrics.memory.usagePercentage,
        diskUsage: metrics.disk.usagePercentage
      });

      this.sendSuccess(res, metrics);
    } catch (error: any) {
      console.error('Failed to get system metrics:', error);
      this.sendError(res, 'Failed to retrieve system metrics', 500);
    }
  }

  /**
   * GET /api/admin/health/database
   * Get database health status
   */
  async getDatabaseHealth(req: AdminRequest, res: Response) {
    try {
      const dbHealth = await this.healthService.checkDatabaseHealth();

      await this.logAdminAction(req.admin.id, 'DATABASE_HEALTH_CHECK', undefined, {
        status: dbHealth.status,
        responseTime: dbHealth.responseTime,
        activeConnections: dbHealth.connections.active
      });

      this.sendSuccess(res, dbHealth);
    } catch (error: any) {
      console.error('Failed to get database health:', error);
      this.sendError(res, 'Failed to check database health', 500);
    }
  }

  /**
   * GET /api/admin/health/services
   * Get external services health status
   */
  async getServicesHealth(req: AdminRequest, res: Response) {
    try {
      const serviceHealth = await this.healthService.checkServiceHealth();

      await this.logAdminAction(req.admin.id, 'SERVICES_HEALTH_CHECK', undefined, {
        redisStatus: serviceHealth.redis?.status,
        minioStatus: serviceHealth.minio?.status,
        elasticsearchStatus: serviceHealth.elasticsearch?.status
      });

      this.sendSuccess(res, serviceHealth);
    } catch (error: any) {
      console.error('Failed to get services health:', error);
      this.sendError(res, 'Failed to check services health', 500);
    }
  }

  /**
   * GET /api/admin/health/performance
   * Get performance metrics
   */
  async getPerformanceMetrics(req: AdminRequest, res: Response) {
    try {
      const performance = await this.healthService.getPerformanceMetrics();

      await this.logAdminAction(req.admin.id, 'PERFORMANCE_METRICS_CHECK', undefined, {
        requestsPerSecond: performance.throughput.requestsPerSecond,
        errorRate: performance.errorRates.ratePercentage
      });

      this.sendSuccess(res, performance);
    } catch (error: any) {
      console.error('Failed to get performance metrics:', error);
      this.sendError(res, 'Failed to retrieve performance metrics', 500);
    }
  }

  /**
   * GET /api/admin/health/summary
   * Get brief health summary for quick checks
   */
  async getHealthSummary(req: AdminRequest, res: Response) {
    try {
      const summary = await this.healthService.getHealthSummary();

      this.sendSuccess(res, summary);
    } catch (error: any) {
      console.error('Failed to get health summary:', error);
      this.sendError(res, 'Failed to retrieve health summary', 500);
    }
  }

  /**
   * POST /api/admin/health/check
   * Run a specific health check
   */
  async runHealthCheck(req: AdminRequest, res: Response) {
    try {
      const { checkType, options } = req.body;

      if (!checkType) {
        return this.sendError(res, 'Check type is required', 400);
      }

      let result;

      switch (checkType) {
        case 'system':
          result = await this.healthService.getSystemMetrics();
          break;
        case 'database':
          result = await this.healthService.checkDatabaseHealth();
          break;
        case 'services':
          result = await this.healthService.checkServiceHealth();
          break;
        case 'performance':
          result = await this.healthService.getPerformanceMetrics();
          break;
        case 'overview':
          result = await this.healthService.getSystemHealthOverview();
          break;
        default:
          return this.sendError(res, `Invalid check type: ${checkType}`, 400);
      }

      await this.logAdminAction(req.admin.id, 'MANUAL_HEALTH_CHECK', undefined, {
        checkType,
        options
      });

      this.sendSuccess(res, {
        checkType,
        timestamp: new Date().toISOString(),
        result
      });
    } catch (error: any) {
      console.error('Failed to run health check:', error);
      await this.logAdminAction(req.admin.id, 'HEALTH_CHECK_ERROR', undefined, {
        error: error.message,
        action: 'MANUAL_CHECK_FAILED'
      });
      this.sendError(res, 'Failed to run health check', 500);
    }
  }

  /**
   * GET /api/admin/health/dependencies
   * Get dependency health checks
   */
  async getDependencyHealth(req: AdminRequest, res: Response) {
    try {
      const [dbHealth, servicesHealth] = await Promise.all([
        this.healthService.checkDatabaseHealth(),
        this.healthService.checkServiceHealth()
      ]);

      const dependencies = {
        database: {
          name: 'PostgreSQL Database',
          status: dbHealth.status,
          responseTime: dbHealth.responseTime,
          lastChecked: dbHealth.lastChecked
        },
        redis: servicesHealth.redis ? {
          name: 'Redis Cache',
          status: servicesHealth.redis.status,
          responseTime: servicesHealth.redis.responseTime,
          lastChecked: new Date()
        } : null,
        minio: servicesHealth.minio ? {
          name: 'MinIO Storage',
          status: servicesHealth.minio.status,
          responseTime: servicesHealth.minio.responseTime,
          lastChecked: new Date()
        } : null,
        elasticsearch: servicesHealth.elasticsearch ? {
          name: 'Elasticsearch',
          status: servicesHealth.elasticsearch.status,
          responseTime: servicesHealth.elasticsearch.responseTime,
          clusterHealth: servicesHealth.elasticsearch.clusterHealth,
          lastChecked: new Date()
        } : null
      };

      await this.logAdminAction(req.admin.id, 'DEPENDENCY_HEALTH_CHECK', undefined, {
        dependenciesChecked: Object.keys(dependencies).filter(key => dependencies[key as keyof typeof dependencies] !== null)
      });

      this.sendSuccess(res, {
        dependencies: Object.fromEntries(
          Object.entries(dependencies).filter(([_, value]) => value !== null)
        )
      });
    } catch (error: any) {
      console.error('Failed to get dependency health:', error);
      this.sendError(res, 'Failed to check dependency health', 500);
    }
  }

  /**
   * GET /api/admin/health/cpu
   * Get detailed CPU metrics
   */
  async getCpuMetrics(req: AdminRequest, res: Response) {
    try {
      const systemMetrics = await this.healthService.getSystemMetrics();
      const loadAverage = os.loadavg();
      const uptime = os.uptime();

      const cpuMetrics = {
        currentLoad: systemMetrics.cpu.usage,
        loadAverage: {
          '1min': loadAverage[0],
          '5min': loadAverage[1],
          '15min': loadAverage[2]
        },
        cores: systemMetrics.cpu.cores,
        uptime,
        uptimeFormatted: this.formatUptime(uptime)
      };

      this.sendSuccess(res, cpuMetrics);
    } catch (error: any) {
      console.error('Failed to get CPU metrics:', error);
      this.sendError(res, 'Failed to retrieve CPU metrics', 500);
    }
  }

  /**
   * GET /api/admin/health/memory
   * Get detailed memory metrics
   */
  async getMemoryMetrics(req: AdminRequest, res: Response) {
    try {
      const memoryData = await this.healthService.getSystemMetrics();

      const memoryMetrics = {
        total: this.formatBytes(memoryData.memory.total),
        used: this.formatBytes(memoryData.memory.used),
        free: this.formatBytes(memoryData.memory.free),
        usagePercentage: memoryData.memory.usagePercentage,
        totalBytes: memoryData.memory.total,
        usedBytes: memoryData.memory.used,
        freeBytes: memoryData.memory.free
      };

      this.sendSuccess(res, memoryMetrics);
    } catch (error: any) {
      console.error('Failed to get memory metrics:', error);
      this.sendError(res, 'Failed to retrieve memory metrics', 500);
    }
  }

  /**
   * GET /api/admin/health/disk
   * Get detailed disk usage metrics
   */
  async getDiskMetrics(req: AdminRequest, res: Response) {
    try {
      const diskData = await this.healthService.getSystemMetrics();

      const diskMetrics = {
        total: this.formatBytes(diskData.disk.total),
        used: this.formatBytes(diskData.disk.used),
        free: this.formatBytes(diskData.disk.free),
        usagePercentage: diskData.disk.usagePercentage,
        totalBytes: diskData.disk.total,
        usedBytes: diskData.disk.used,
        freeBytes: diskData.disk.free
      };

      this.sendSuccess(res, diskMetrics);
    } catch (error: any) {
      console.error('Failed to get disk metrics:', error);
      this.sendError(res, 'Failed to retrieve disk metrics', 500);
    }
  }

  /**
   * Helper method to log admin actions
   */
  private async logAdminAction(userId: string, action: string, targetId?: string, details?: any) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          target: 'SYSTEM',
          targetId,
          details,
          ipAddress: '',
          userAgent: ''
        }
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }

  /**
   * Helper method to format uptime from seconds to readable string
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Helper method to format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const systemHealthController = new SystemHealthController();