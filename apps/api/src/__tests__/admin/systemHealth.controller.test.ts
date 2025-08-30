
import { Request, Response } from 'express';
import { systemHealthController } from '../../controllers/admin/systemHealth.controller';
import { prisma } from '../../lib/prisma';
import { SystemHealthService } from '../../services/admin/systemHealth.service';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../services/admin/systemHealth.service');

// Mock node:os module
jest.mock('os', () => ({
  uptime: jest.fn(),
  loadavg: jest.fn(),
}));

describe('SystemHealthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;
  let mockSystemHealthService: jest.Mocked<SystemHealthService>;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnThis();

    mockResponse = {
      json: jsonSpy,
      status: statusSpy,
      send: jest.fn(),
    };

    mockRequest = {
      query: {},
      params: {},
      body: {},
    };

    jest.clearAllMocks();
  });

  describe('getHealthOverview', () => {
    it('should return system health overview successfully', async () => {
      const mockHealthData = {
        overall: 'healthy',
        system: { status: 'healthy', cpu: { usage: 45 } },
        database: { status: 'healthy', responseTime: 25 },
        services: { redis: { status: 'healthy' }, minio: { status: 'healthy' } },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getSystemHealthOverview = jest.fn().mockResolvedValue(mockHealthData);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getHealthOverview(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.getSystemHealthOverview).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-id',
          action: 'HEALTH_CHECK_OVERVIEW',
          target: 'SYSTEM',
          details: expect.objectContaining({
            overallStatus: 'healthy',
            filtersApplied: expect.any(Object),
          }),
        }),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockHealthData });
    });

    it('should handle errors and log them', async () => {
      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getSystemHealthOverview = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getHealthOverview(adminRequest, mockResponse as Response);

      expect(prisma.auditLog.create).toHaveBeenCalledTimes(2); // One for success attempt, one for error
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Failed to retrieve system health overview',
      });
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics successfully', async () => {
      const mockMetrics = {
        cpu: { usage: 45, cores: 4 },
        memory: { usagePercentage: 60, total: 8192, used: 4915, free: 3277 },
        disk: { usagePercentage: 75, total: 512 * 1024, used: 384 * 1024, free: 128 * 1024 },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getSystemMetrics = jest.fn().mockResolvedValue(mockMetrics);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getSystemMetrics(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.getSystemMetrics).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-id',
          action: 'SYSTEM_METRICS_CHECK',
          target: 'SYSTEM',
          details: {
            cpuUsage: 45,
            memoryUsage: 60,
            diskUsage: 75,
          },
        }),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockMetrics });
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health successfully', async () => {
      const mockDbHealth = {
        status: 'healthy',
        responseTime: 25,
        connections: { active: 15, idle: 5, max: 100 },
        lastChecked: new Date(),
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.checkDatabaseHealth = jest.fn().mockResolvedValue(mockDbHealth);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getDatabaseHealth(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.checkDatabaseHealth).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-id',
          action: 'DATABASE_HEALTH_CHECK',
          target: 'SYSTEM',
          details: {
            status: 'healthy',
            responseTime: 25,
            activeConnections: 15,
          },
        }),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockDbHealth });
    });
  });

  describe('getServicesHealth', () => {
    it('should return services health successfully', async () => {
      const mockServiceHealth = {
        redis: { status: 'healthy', responseTime: 2 },
        minio: { status: 'healthy', responseTime: 5 },
        elasticsearch: { status: 'degraded', responseTime: 50, clusterHealth: 'yellow' },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.checkServiceHealth = jest.fn().mockResolvedValue(mockServiceHealth);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getServicesHealth(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.checkServiceHealth).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-id',
          action: 'SERVICES_HEALTH_CHECK',
          target: 'SYSTEM',
          details: {
            redisStatus: 'healthy',
            minioStatus: 'healthy',
            elasticsearchStatus: 'degraded',
          },
        }),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockServiceHealth });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics successfully', async () => {
      const mockPerformance = {
        throughput: { requestsPerSecond: 45.5, activeConnections: 15 },
        errorRates: { ratePercentage: 2.3, totalErrors: 45 },
        responseTimes: { average: 125, p95: 300, p99: 800 },
        concurrentUsers: { current: 234, peak: 500 },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getPerformanceMetrics = jest.fn().mockResolvedValue(mockPerformance);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getPerformanceMetrics(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.getPerformanceMetrics).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-id',
          action: 'PERFORMANCE_METRICS_CHECK',
          target: 'SYSTEM',
          details: {
            requestsPerSecond: 45.5,
            errorRate: 2.3,
          },
        }),
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockPerformance });
    });
  });

  describe('getHealthSummary', () => {
    it('should return health summary successfully', async () => {
      const mockSummary = {
        status: 'healthy',
        uptime: '2d 4h 15m',
        lastCheck: new Date(),
        criticalIssues: 0,
        warnings: 2,
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getHealthSummary = jest.fn().mockResolvedValue(mockSummary);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getHealthSummary(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.getHealthSummary).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockSummary });
    });
  });

  describe('runHealthCheck', () => {
    it('should run system health check successfully', async () => {
      const mockSystemMetrics = {
        cpu: { usage: 35 },
        memory: { usagePercentage: 55 },
        disk: { usagePercentage: 70 },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getSystemMetrics = jest.fn().mockResolvedValue(mockSystemMetrics);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      mockRequest.body = { checkType: 'system', options: { detailed: true } };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.runHealthCheck(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.getSystemMetrics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          checkType: 'system',
          timestamp: expect.any(String),
          result: mockSystemMetrics,
        },
      });
    });

    it('should run database health check', async () => {
      const mockDbHealth = { status: 'healthy', responseTime: 20 };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.checkDatabaseHealth = jest.fn().mockResolvedValue(mockDbHealth);

      mockRequest.body = { checkType: 'database' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.runHealthCheck(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.checkDatabaseHealth).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing checkType', async () => {
      mockRequest.body = {};

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.runHealthCheck(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Check type is required',
      });
    });

    it('should return 400 for invalid checkType', async () => {
      mockRequest.body = { checkType: 'invalid' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.runHealthCheck(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Invalid check type: invalid',
      });
    });
  });

  describe('getDependencyHealth', () => {
    it('should return dependency health successfully', async () => {
      const mockDbHealth = {
        status: 'healthy',
        responseTime: 25,
        connections: { active: 10 },
        lastChecked: new Date(),
      };

      const mockServicesHealth = {
        redis: { status: 'healthy', responseTime: 3 },
        minio: { status: 'healthy', responseTime: 8 },
        elasticsearch: { status: 'healthy', responseTime: 45, clusterHealth: 'green' },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.checkDatabaseHealth = jest.fn().mockResolvedValue(mockDbHealth);
      mockSystemHealthService.prototype.checkServiceHealth = jest.fn().mockResolvedValue(mockServicesHealth);

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getDependencyHealth(adminRequest, mockResponse as Response);

      expect(mockSystemHealthService.prototype.checkDatabaseHealth).toHaveBeenCalled();
      expect(mockSystemHealthService.prototype.checkServiceHealth).toHaveBeenCalled();

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          dependencies: {
            database: expect.objectContaining({
              name: 'PostgreSQL Database',
              status: 'healthy',
            }),
            redis: expect.objectContaining({
              name: 'Redis Cache',
              status: 'healthy',
            }),
            minio: expect.objectContaining({
              name: 'MinIO Storage',
              status: 'healthy',
            }),
            elasticsearch: expect.objectContaining({
              name: 'Elasticsearch',
              status: 'healthy',
            }),
          },
        },
      });
    });
  });

  describe('getCpuMetrics', () => {
    it('should return CPU metrics successfully', async () => {
      const mockSystemMetrics = {
        cpu: { usage: 45, cores: 8 },
      };

      const os = require('os');
      (os.uptime as jest.Mock).mockReturnValue(172800); // 2 days in seconds
      (os.loadavg as jest.Mock).mockReturnValue([1.5, 2.0, 1.8]);

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getSystemMetrics = jest.fn().mockResolvedValue(mockSystemMetrics);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getCpuMetrics(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: {
          currentLoad: 45,
          loadAverage: { '1min': 1.5, '5min': 2.0, '15min': 1.8 },
          cores: 8,
          uptime: 172800,
          uptimeFormatted: '2d 0h 0m',
        },
      });
    });
  });

  describe('getMemoryMetrics', () => {
    it('should return memory metrics successfully', async () => {
      const mockSystemMetrics = {
        memory: {
          total: 8589934592, // 8GB
          used: 4294967296,  // 4GB
          free: 4294967296,  // 4GB
          usagePercentage: 50,
        },
      };

      mockSystemHealthService = require('../../services/admin/systemHealth.service').SystemHealthService as jest.Mocked<SystemHealthService>;
      mockSystemHealthService.prototype.getSystemMetrics = jest.fn().mockResolvedValue(mockSystemMetrics);

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await systemHealthController.getMemoryMetrics(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          total: '8.00 GB',
          used: '4.00 GB',
          free: '4.00 GB',
          usagePercentage: 50,
          totalBytes: 8589934592,
          usedBytes: 4294967296,
          freeBytes: 4294967296,
        }),
      });
    });
  });

  describe('getDiskMetrics', () => {
    it('should return disk metrics successfully', async () => {
      const mockSystemMetrics = {
        disk: {