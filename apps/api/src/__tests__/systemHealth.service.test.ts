import { SystemHealthService } from '../services/admin/systemHealth.service';

// Mock systeminformation
jest.mock('systeminformation');

const mockSystemInfo = require('systeminformation') as jest.Mocked<{
  cpu: jest.Mock;
  currentLoad: jest.Mock;
  mem: jest.Mock;
  fsSize: jest.Mock;
}>;

// Mock dependencies
jest.mock('ioredis');
jest.mock('@elastic/elasticsearch');
jest.mock('@aws-sdk/client-s3');

const { Redis } = require('ioredis') as any;
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch') as any;
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3') as any;

// Mock os
jest.mock('os', () => ({
  loadavg: jest.fn(),
  uptime: jest.fn()
}));

const mockOs = require('os');

describe('SystemHealthService', () => {
  let service: SystemHealthService;

  beforeEach(() => {
    service = new SystemHealthService();
    jest.clearAllMocks();
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics successfully', async () => {
      // Mock system info responses
      mockSystemInfo.cpu.mockResolvedValue({ cores: 8 });
      mockSystemInfo.currentLoad.mockResolvedValue({ currentLoad: 45.5 });
      mockSystemInfo.mem.mockResolvedValue({
        total: 16777216, // 16GB in KB
        used: 8388608,   // 8GB in KB
        free: 8388608    // 8GB in KB
      });
      mockSystemInfo.fsSize.mockResolvedValue([
        { size: 1000000000, used: 500000000, use: 50 }
      ]);

      const metrics = await service.getSystemMetrics();

      expect(metrics.cpu.usage).toBe(46); // Rounded
      expect(metrics.cpu.cores).toBe(8);
      expect(metrics.memory.usagePercentage).toBe(50);
      expect(metrics.disk.usagePercentage).toBe(50);
    });

    it('should handle system information errors', async () => {
      mockSystemInfo.cpu.mockRejectedValue(new Error('System info unavailable'));

      await expect(service.getSystemMetrics()).rejects.toThrow('Failed to collect system metrics');
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy database status', async () => {
      const mockConnectionInfo = [{ active_connections: '5' }];
      const mockConnectionPool = [{ available_connections: '10', total_connections: '15' }];

      // Mock Prisma queries
      const mockPrisma = require('../lib/prisma');
      mockPrisma.$queryRaw = jest.fn();
      mockPrisma.$queryRaw.mockResolvedValueOnce(mockConnectionInfo);
      mockPrisma.$queryRaw.mockResolvedValueOnce(mockConnectionPool);

      const health = await service.checkDatabaseHealth();

      expect(health.status).toBe('healthy');
      expect(health.connections.active).toBe(5);
      expect(health.connections.available).toBe(10);
    });

    it('should return unhealthy status for slow response', async () => {
      const mockPrisma = require('../lib/prisma');
      mockPrisma.$queryRaw = jest.fn();
      mockPrisma.$queryRaw.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve([]), 6000) // 6 seconds delay
      ));

      const health = await service.checkDatabaseHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.responseTime).toBeGreaterThanOrEqual(6000);
    });

    it('should handle database connection errors', async () => {
      const mockPrisma = require('../lib/prisma');
      mockPrisma.$queryRaw = jest.fn();
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const health = await service.checkDatabaseHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.connections.active).toBe(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('checkServiceHealth', () => {
    beforeEach(() => {
      // Mock Redis
      Redis.mockImplementation(() => ({
        ping: jest.fn().mockResolvedValue('PONG'),
        disconnect: jest.fn()
      }));

      // Mock Elasticsearch
      ElasticsearchClient.mockImplementation(() => ({
        cluster: {
          health: jest.fn().mockResolvedValue({
            body: { status: 'green' }
          })
        }
      }));

      // Mock S3
      S3Client.mockImplementation(() => ({
        send: jest.fn()
      }));
    });

    it('should check all services successfully', async () => {
      const services = await service.checkServiceHealth();

      expect(services.redis?.status).toBe('healthy');
      expect(services.redis?.connected).toBe(true);

      expect(services.elasticsearch?.status).toBe('healthy');
      expect(services.elasticsearch?.connected).toBe(true);
      expect(services.elasticsearch?.clusterHealth).toBe('green');
    });

    it('should handle Redis connection failure', async () => {
      Redis.mockImplementation(() => ({
        ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: jest.fn()
      }));

      const services = await service.checkServiceHealth();

      expect(services.redis?.status).toBe('unhealthy');
      expect(services.redis?.connected).toBe(false);
      expect(services.redis?.responseTime).toBe(0);
    });

    it('should handle Elasticsearch connection failure', async () => {
      ElasticsearchClient.mockImplementation(() => ({
        cluster: {
          health: jest.fn().mockRejectedValue(new Error('Connection failed'))
        }
      }));

      const services = await service.checkServiceHealth();

      expect(services.elasticsearch?.status).toBe('unhealthy');
      expect(services.elasticsearch?.connected).toBe(false);
    });

    it('should handle MinIO when endpoint is configured', async () => {
      process.env.MINIO_ENDPOINT = 'http://localhost:9000';
      process.env.AWS_ACCESS_KEY_ID = 'test';
      process.env.AWS_SECRET_ACCESS_KEY = 'test';

      const services = await service.checkServiceHealth();

      expect(services.minio?.status).toBe('healthy');
      expect(services.minio?.accessible).toBe(true);
    });

    it('should skip MinIO when not configured', async () => {
      delete process.env.MINIO_ENDPOINT;

      const services = await service.checkServiceHealth();

      expect(services.minio).toBeUndefined();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics successfully', async () => {
      const mockPrismaAuditLog = {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', createdAt: new Date(Date.now() - 5000) },
          { id: '2', createdAt: new Date(Date.now() - 2000) }
        ]),
        count: jest.fn().mockResolvedValue(10)
      };

      jest.spyOn(require('../lib/prisma'), 'auditLog', 'get').mockReturnValue(mockPrismaAuditLog);

      const metrics = await service.getPerformanceMetrics();

      expect(mockPrismaAuditLog.findMany).toHaveBeenCalled();
      expect(mockPrismaAuditLog.count).toHaveBeenCalled();
      expect(metrics.throughput.requestsPerSecond).toBeGreaterThan(0);
      expect(metrics.throughput.requestsPerMinute).toBeGreaterThan(0);
      expect(metrics.errorRates.ratePercentage).toBeDefined();
    });

    it('should handle database query errors', async () => {
      const mockPrismaAuditLog = {
        findMany: jest.fn().mockRejectedValue(new Error('Database error')),
        count: jest.fn()
      };

      jest.spyOn(require('../lib/prisma'), 'auditLog', 'get').mockReturnValue(mockPrismaAuditLog);

      await expect(service.getPerformanceMetrics()).rejects.toThrow('Failed to collect performance metrics');
    });
  });

  describe('getSystemHealthOverview', () => {
    it('should return healthy overview when all checks pass', async () => {
      // Mock healthy responses
      mockSystemInfo.cpu.mockResolvedValue({ cores: 4 });
      mockSystemInfo.currentLoad.mockResolvedValue({ currentLoad: 25 });
      mockSystemInfo.mem.mockResolvedValue({ total: 16000, used: 4000, free: 12000 });
      mockSystemInfo.fsSize.mockResolvedValue([{ size: 1000000, used: 200000, use: 20 }]);

      // Mock healthy database
      const prismaSpy = jest.spyOn(require('../lib/prisma'), '$queryRaw');
      prismaSpy.mockResolvedValue([]);

      // Mock healthy services
      Redis.mockImplementation(() => ({
        ping: jest.fn().mockResolvedValue('PONG'),
        disconnect: jest.fn()
      }));

      const overview = await service.getSystemHealthOverview();

      expect(overview.overall).toBe('healthy');
      expect(overview.systemMetrics).toBeDefined();
      expect(overview.databaseHealth).toBeDefined();
      expect(overview.serviceHealth).toBeDefined();
      expect(overview.performanceMetrics).toBeDefined();
      expect(overview.lastChecked).toBeInstanceOf(Date);
    });

    it('should return degraded status when some metrics are high', async () => {
      // Mock high CPU usage
      mockSystemInfo.cpu.mockResolvedValue({ cores: 4 });
      mockSystemInfo.currentLoad.mockResolvedValue({ currentLoad: 75 }); // High usage
      mockSystemInfo.mem.mockResolvedValue({ total: 16000, used: 12000, free: 4000 }); // 75% memory
      mockSystemInfo.fsSize.mockResolvedValue([{ size: 1000000, used: 800000, use: 80 }]); // 80% disk

      const prismaSpy = jest.spyOn(require('../lib/prisma'), '$queryRaw');
      prismaSpy.mockResolvedValue([]);

      Redis.mockImplementation(() => ({
        ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: jest.fn()
      }));

      const overview = await service.getSystemHealthOverview();

      expect(overview.overall).toBe('degraded');
    });

    it('should return unhealthy status when critical systems fail', async () => {
      // Mock high resource usage
      mockSystemInfo.cpu.mockResolvedValue({ cores: 4 });
      mockSystemInfo.currentLoad.mockResolvedValue({ currentLoad: 95 });
      mockSystemInfo.mem.mockResolvedValue({ total: 16000, used: 15000, free: 1000 });
      mockSystemInfo.fsSize.mockResolvedValue([{ size: 1000000, used: 950000, use: 95 }]);

      // Mock database failure
      const prismaSpy = jest.spyOn(require('../lib/prisma'), '$queryRaw');
      prismaSpy.mockRejectedValue(new Error('Database connection failed'));

      const overview = await service.getSystemHealthOverview();

      expect(overview.overall).toBe('unhealthy');
    });

    it('should handle errors gracefully', async () => {
      mockSystemInfo.cpu.mockRejectedValue(new Error('System info failed'));

      await expect(service.getSystemHealthOverview()).rejects.toThrow('Failed to generate system health overview');
    });
  });

  describe('getHealthSummary', () => {
    it('should return health summary successfully', async () => {
      mockOs.uptime.mockReturnValue(86400); // 24 hours in seconds

      // Mock overview
      const overviewMock = {
        overall: 'healthy',
        databaseHealth: { status: 'healthy' },
        serviceHealth: {
          redis: { status: 'healthy' },
          minio: { status: 'healthy' },
          elasticsearch: { status: 'unhealthy' }
        }
      };

      jest.spyOn(service, 'getSystemHealthOverview').mockResolvedValue(overviewMock as any);

      const summary = await service.getHealthSummary();

      expect(summary.status).toBe('healthy');
      expect(summary.uptime).toBe(86400);
      expect(summary.checks.database).toBe('healthy');
      expect(summary.checks.redis).toBe('healthy');
      expect(summary.checks.elasticsearch).toBe('unhealthy');
    });

    it('should return unhealthy status when overview fails', async () => {
      jest.spyOn(service, 'getSystemHealthOverview').mockRejectedValue(new Error('Health check failed'));

      const summary = await service.getHealthSummary();

      expect(summary.status).toBe('unhealthy');
      expect(summary.uptime).toBeGreaterThan(0);
      expect(summary.checks.database).toBe('unknown');
      expect(summary.checks.redis).toBe('unknown');
      expect(summary.checks.elasticsearch).toBe('unknown');
    });
  });
});