import { PrismaClient } from '@prisma/client';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Redis } from 'ioredis';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import * as si from 'systeminformation';
import { logAdminAction, logSecurityEvent } from '../../utils/auditLogger';

const prisma = new PrismaClient();

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  connections: {
    active: number;
    total: number;
    available: number;
  };
  lastChecked: Date;
}

export interface ServiceHealth {
  redis?: {
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    connected: boolean;
  };
  minio?: {
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    accessible: boolean;
  };
  elasticsearch?: {
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    connected: boolean;
    clusterHealth?: string;
  };
}

export interface PerformanceMetrics {
  responseTimes: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  errorRates: {
    total: number;
    ratePercentage: number;
    last24Hours: number;
  };
}

export interface SystemHealthOverview {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  systemMetrics: SystemMetrics;
  databaseHealth: DatabaseHealth;
  serviceHealth: ServiceHealth;
  performanceMetrics: PerformanceMetrics;
  lastChecked: Date;
}

export class SystemHealthService {
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // CPU information
      const cpuData = await si.cpu();
      const cpuLoad = await si.currentLoad();

      // Memory information
      const memData = await si.mem();

      // Disk information (for primary drive)
      const diskData = await si.fsSize();
      const primaryDisk = diskData[0]; // Primary filesystem

      const metrics: SystemMetrics = {
        cpu: {
          usage: Math.round(cpuLoad.currentLoad),
          loadAverage: os.loadavg(),
          cores: cpuData.cores
        },
        memory: {
          total: memData.total,
          used: memData.used,
          free: memData.free,
          usagePercentage: Math.round((memData.used / memData.total) * 100)
        },
        disk: {
          total: primaryDisk?.size || 0,
          used: primaryDisk?.used || 0,
          free: (primaryDisk?.size || 0) - (primaryDisk?.used || 0),
          usagePercentage: primaryDisk?.use || 0
        }
      };

      return metrics;
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw new Error('Failed to collect system metrics');
    }
  }

  async checkDatabaseHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Test database connection and get connection info
      const connectionInfo = await prisma.$queryRaw`SELECT count(*) as active_connections FROM pg_stat_activity;`;

      let activeConnections = 0;
      if (Array.isArray(connectionInfo) && connectionInfo.length > 0) {
        activeConnections = parseInt((connectionInfo[0] as any).active_connections);
      }

      const responseTime = Date.now() - startTime;

      // Get connection pool info from Prisma
      const connectionPool = await prisma.$queryRaw`SELECT count(*) as total_connections, count(CASE WHEN state = 'idle' THEN 1 END) as available_connections FROM pg_stat_activity;`;

      let availableConnections = 0;
      if (Array.isArray(connectionPool) && connectionPool.length > 0) {
        availableConnections = parseInt((connectionPool[0] as any).available_connections);
      }

      // Determine health status based on response time and connections
      const healthStatus: DatabaseHealth['status'] =
        responseTime > 5000 ? 'unhealthy' :
        responseTime > 2000 ? 'degraded' :
        'healthy';

      return {
        status: healthStatus,
        responseTime,
        connections: {
          active: activeConnections,
          total: activeConnections + availableConnections, // Estimated total
          available: availableConnections
        },
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        connections: {
          active: 0,
          total: 0,
          available: 0
        },
        lastChecked: new Date()
      };
    }
  }

  async checkServiceHealth(): Promise<ServiceHealth> {
    const services: ServiceHealth = {};

    // Redis health check
    try {
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      const startTime = Date.now();
      await redis.ping();
      const responseTime = Date.now() - startTime;

      services.redis = {
        status: responseTime > 1000 ? 'unhealthy' : 'healthy',
        responseTime,
        connected: true
      };

      redis.disconnect();
    } catch (error) {
      services.redis = {
        status: 'unhealthy',
        responseTime: 0,
        connected: false
      };
    }

    // MinIO/S3 health check
    if (process.env.MINIO_ENDPOINT) {
      try {
        const startTime = Date.now();
        const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

        const s3Client = new S3Client({
          region: process.env.AWS_REGION || 'us-east-1',
          endpoint: process.env.MINIO_ENDPOINT,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY
          }
        });

        await s3Client.send(new ListBucketsCommand({}));
        const responseTime = Date.now() - startTime;

        services.minio = {
          status: responseTime > 5000 ? 'unhealthy' : 'healthy',
          responseTime,
          accessible: true
        };
      } catch (error) {
        services.minio = {
          status: 'unhealthy',
          responseTime: 0,
          accessible: false
        };
      }
    }

    // Elasticsearch health check
    if (process.env.ELASTICSEARCH_NODE) {
      try {
        const esClient = new ElasticsearchClient({
          node: process.env.ELASTICSEARCH_NODE
        });

        const startTime = Date.now();
        const health = await esClient.cluster.health();
        const responseTime = Date.now() - startTime;

        services.elasticsearch = {
          status: responseTime > 5000 ? 'unhealthy' : 'healthy',
          responseTime,
          connected: true,
          clusterHealth: health.body.status
        };
      } catch (error) {
        services.elasticsearch = {
          status: 'unhealthy',
          responseTime: 0,
          connected: false
        };
      }
    }

    return services;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Get response times from audit logs (recent requests)
      const recentRequests = await prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000
      });

      // Calculate throughput
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const lastMinute = new Date(now.getTime() - 60 * 1000);

      const requestsPerHour = await prisma.auditLog.count({
        where: { createdAt: { gte: lastHour } }
      });

      const requestsPerMinute = recentRequests.filter(
        req => req.createdAt >= lastMinute
      ).length;

      // Error rate calculation
      const errorLogs = await prisma.auditLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          action: { contains: 'ERROR' }
        }
      });

      const totalLogs = recentRequests.length;
      const errorRatePercentage = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

      return {
        responseTimes: {
          average: 250, // Placeholder - would need actual response time logging
          p95: 500,
          p99: 1000
        },
        throughput: {
          requestsPerSecond: requestsPerMinute / 60,
          requestsPerMinute: requestsPerMinute,
          requestsPerHour: requestsPerHour
        },
        errorRates: {
          total: errorLogs,
          ratePercentage: Math.round(errorRatePercentage * 100) / 100,
          last24Hours: errorLogs
        }
      };
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
      throw new Error('Failed to collect performance metrics');
    }
  }

  async getSystemHealthOverview(): Promise<SystemHealthOverview> {
    try {
      const [systemMetrics, databaseHealth, serviceHealth, performanceMetrics] = await Promise.all([
        this.getSystemMetrics(),
        this.checkDatabaseHealth(),
        this.checkServiceHealth(),
        this.getPerformanceMetrics()
      ]);

      // Determine overall health status
      let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Check system metrics thresholds
      if (systemMetrics.cpu.usage > 90 || systemMetrics.memory.usagePercentage > 90 || systemMetrics.disk.usagePercentage > 90) {
        overall = 'unhealthy';
      } else if (systemMetrics.cpu.usage > 70 || systemMetrics.memory.usagePercentage > 80 || systemMetrics.disk.usagePercentage > 80) {
        overall = 'degraded';
      }

      // Check database health
      if (databaseHealth.status === 'unhealthy') {
        overall = 'unhealthy';
      } else if (databaseHealth.status === 'degraded') {
        overall = overall === 'unhealthy' ? 'unhealthy' : 'degraded';
      }

      // Check service health
      const unhealthyServices = Object.values(serviceHealth).filter(
        service => service?.status === 'unhealthy'
      ).length;
      const totalServices = Object.keys(serviceHealth).length;

      if (unhealthyServices > 0) {
        overall = unhealthyServices === totalServices ? 'unhealthy' : 'degraded';
      }

      // Check performance metrics
      if (performanceMetrics.errorRates.ratePercentage > 5) {
        overall = overall === 'unhealthy' ? 'unhealthy' : 'degraded';
      }

      const healthOverview = {
        overall,
        systemMetrics,
        databaseHealth,
        serviceHealth,
        performanceMetrics,
        lastChecked: new Date()
      };

      // Log health monitoring action
      await logAdminAction('system', 'SYSTEM_HEALTH_CHECKED', null, {
        overallStatus: overall,
        systemMetrics: {
          cpuUsage: systemMetrics.cpu.usage,
          memoryUsage: systemMetrics.memory.usagePercentage,
          diskUsage: systemMetrics.disk.usagePercentage
        },
        databaseStatus: databaseHealth.status,
        serviceStatuses: Object.entries(serviceHealth).map(([service, health]) => ({
          service,
          status: health?.status
        })),
        performanceMetrics: {
          responseTime: performanceMetrics.responseTimes.average,
          errorRate: performanceMetrics.errorRates.ratePercentage
        }
      });

      // Log security event if system is unhealthy
      if (overall === 'unhealthy') {
        await logSecurityEvent('SYSTEM_HEALTH_UNHEALTHY', 'HIGH', {
          systemMetrics,
          databaseHealth,
          serviceHealth,
          performanceMetrics
        });
      }

      return healthOverview;
    } catch (error) {
      console.error('Error generating system health overview:', error);

      // Log error in health monitoring
      await logAdminAction('system', 'SYSTEM_HEALTH_CHECK_FAILED', null, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error('Failed to generate system health overview');
    }
  }

  async getHealthSummary(): Promise<{
    status: string;
    uptime: number;
    checks: {
      database: string;
      redis: string;
      minio: string;
      elasticsearch: string;
    };
  }> {
    try {
      const health = await this.getSystemHealthOverview();

      return {
        status: health.overall,
        uptime: process.uptime(),
        checks: {
          database: health.databaseHealth.status,
          redis: health.serviceHealth.redis?.status || 'unknown',
          minio: health.serviceHealth.minio?.status || 'unknown',
          elasticsearch: health.serviceHealth.elasticsearch?.status || 'unknown'
        }
      };
    } catch (error) {
      console.error('Error generating health summary:', error);
      return {
        status: 'unhealthy',
        uptime: process.uptime(),
        checks: {
          database: 'unknown',
          redis: 'unknown',
          minio: 'unknown',
          elasticsearch: 'unknown'
        }
      };
    }
  }
}