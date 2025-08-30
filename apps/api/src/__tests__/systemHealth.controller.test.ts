import { Request, Response } from 'express';

// Mock the entire controller module to test the exported singleton
jest.mock('../controllers/admin/systemHealth.controller', () => ({
  systemHealthController: {
    getHealthOverview: jest.fn(),
    getSystemMetrics: jest.fn(),
    getDatabaseHealth: jest.fn(),
    getServicesHealth: jest.fn(),
    getPerformanceMetrics: jest.fn(),
    getHealthSummary: jest.fn(),
    runHealthCheck: jest.fn(),
    getDependencyHealth: jest.fn(),
    getCpuMetrics: jest.fn(),
    getMemoryMetrics: jest.fn(),
    getDiskMetrics: jest.fn()
  }
}));

import { systemHealthController } from '../controllers/admin/systemHealth.controller';

const mockResponse = {
  json: jest.fn(),
  status: jest.fn().mockReturnThis()
} as Partial<Response>;

describe('SystemHealthController', () => {
  let mockRequest: Partial<Request> & { admin: { id: string } };

  beforeEach(() => {
    mockRequest = {
      admin: { id: 'admin123' },
      query: {},
      params: {},
      body: {}
    };

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getHealthOverview', () => {
    it('should return health overview successfully with default filters', async () => {
      const mockHealthData = {
        overall: 'healthy',
        systemMetrics: { cpu: { usage: 25 }, memory: { usagePercentage: 45 } },
        databaseHealth: { status: 'healthy' },
        serviceHealth: { redis: { status: 'healthy' } },
        performanceMetrics: { errorRates: { ratePercentage: 0.5 } },
        lastChecked: new Date()
      };

      mockServiceInstance.getSystemHealthOverview.mockResolvedValue(mockHealthData);

      await controller.getHealthOverview(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getSystemHealthOverview).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockHealthData);
    });

    it('should return health overview with custom query parameters', async () => {
      const mockHealthData = { overall: 'healthy', systemMetrics: {}, databaseHealth: {}, serviceHealth: {}, performanceMetrics: {}, lastChecked: new Date() };
      mockServiceInstance.getSystemHealthOverview.mockResolvedValue(mockHealthData);

      mockRequest.query = {
        includeDetails: 'true',
        checkServices: 'false',
        checkPerformance: 'true'
      };

      await controller.getHealthOverview(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getSystemHealthOverview).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockHealthData);
    });

    it('should handle service errors', async () => {
      const error = new Error('Health check failed');
      mockServiceInstance.getSystemHealthOverview.mockRejectedValue(error);

      mockRequest.query = {};

      await controller.getHealthOverview(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve system health overview'
      });
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics successfully', async () => {
      const mockMetrics = {
        cpu: { usage: 30, loadAverage: [1.5, 2.0, 1.8], cores: 4 },
        memory: { total: 16384, used: 8192, free: 8192, usagePercentage: 50 },
        disk: { total: 1000000, used: 500000, free: 500000, usagePercentage: 50 }
      };

      mockServiceInstance.getSystemMetrics.mockResolvedValue(mockMetrics);

      await controller.getSystemMetrics(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getSystemMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockMetrics);
    });

    it('should handle service errors', async () => {
      const error = new Error('Metrics collection failed');
      mockServiceInstance.getSystemMetrics.mockRejectedValue(error);

      await controller.getSystemMetrics(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve system metrics'
      });
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health successfully', async () => {
      const mockDbHealth = {
        status: 'healthy',
        responseTime: 45,
        connections: { active: 10, total: 20, available: 10 },
        lastChecked: new Date()
      };

      mockServiceInstance.checkDatabaseHealth.mockResolvedValue(mockDbHealth);

      await controller.getDatabaseHealth(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.checkDatabaseHealth).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockDbHealth);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockServiceInstance.checkDatabaseHealth.mockRejectedValue(error);

      await controller.getDatabaseHealth(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to check database health'
      });
    });
  });

  describe('getServicesHealth', () => {
    it('should return services health successfully', async () => {
      const mockServicesHealth = {
        redis: { status: 'healthy', responseTime: 5, connected: true },
        elasticsearch: { status: 'healthy', responseTime: 15, connected: true },
        minio: { status: 'unhealthy', responseTime: 0, accessible: false }
      };

      mockServiceInstance.checkServiceHealth.mockResolvedValue(mockServicesHealth);

      await controller.getServicesHealth(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.checkServiceHealth).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockServicesHealth);
    });

    it('should handle service errors', async () => {
      const error = new Error('Services check failed');
      mockServiceInstance.checkServiceHealth.mockRejectedValue(error);

      await controller.getServicesHealth(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to check services health'
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics successfully', async () => {
      const mockPerformanceMetrics = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        throughput: { requestsPerSecond: 25, requestsPerMinute: 1500, requestsPerHour: 90000 },
        errorRates: { total: 45, ratePercentage: 1.5, last24Hours: 45 }
      };

      mockServiceInstance.getPerformanceMetrics.mockResolvedValue(mockPerformanceMetrics);

      await controller.getPerformanceMetrics(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getPerformanceMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockPerformanceMetrics);
    });

    it('should handle service errors', async () => {
      const error = new Error('Performance metrics failed');
      mockServiceInstance.getPerformanceMetrics.mockRejectedValue(error);

      await controller.getPerformanceMetrics(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    });
  });

  describe('getHealthSummary', () => {
    it('should return health summary successfully', async () => {
      const mockSummary = {
        status: 'healthy',
        uptime: 86400,
        checks: {
          database: 'healthy',
          redis: 'healthy',
          minio: 'healthy',
          elasticsearch: 'healthy'
        }
      };

      mockServiceInstance.getHealthSummary.mockResolvedValue(mockSummary);

      await controller.getHealthSummary(mockRequest as Request, mockResponse as Response);

      expect(mockServiceInstance.getHealthSummary).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(mockSummary);
    });

    it('should handle service errors', async () => {
      const error = new Error('Health summary failed');
      mockServiceInstance.getHealthSummary.mockRejectedValue(error);

      await controller.getHealthSummary(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve health summary'
      });
    });
  });

  describe('runHealthCheck', () => {
    it('should run system health check successfully', async () => {
      const mockMetrics = { cpu: { usage: 25 }, memory: { usagePercentage: 45 }, disk: { usagePercentage: 60 } };
      mockServiceInstance.getSystemMetrics.mockResolvedValue(mockMetrics);
      mockRequest.body = { checkType: 'system' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getSystemMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        checkType: 'system',
        timestamp: expect.any(String),
        result: mockMetrics
      });
    });

    it('should run database health check successfully', async () => {
      const mockDbHealth = { status: 'healthy', responseTime: 25 };
      mockServiceInstance.checkDatabaseHealth.mockResolvedValue(mockDbHealth);
      mockRequest.body = { checkType: 'database' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.checkDatabaseHealth).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        checkType: 'database',
        timestamp: expect.any(String),
        result: mockDbHealth
      });
    });

    it('should run services health check successfully', async () => {
      const mockServicesHealth = { redis: { status: 'healthy' }, minio: { status: 'healthy' } };
      mockServiceInstance.checkServiceHealth.mockResolvedValue(mockServicesHealth);
      mockRequest.body = { checkType: 'services' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.checkServiceHealth).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        checkType: 'services',
        timestamp: expect.any(String),
        result: mockServicesHealth
      });
    });

    it('should run performance health check successfully', async () => {
      const mockPerformanceMetrics = { responseTimes: { average: 100 }, throughput: { requestsPerSecond: 20 }, errorRates: { ratePercentage: 1 } };
      mockServiceInstance.getPerformanceMetrics.mockResolvedValue(mockPerformanceMetrics);
      mockRequest.body = { checkType: 'performance' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getPerformanceMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        checkType: 'performance',
        timestamp: expect.any(String),
        result: mockPerformanceMetrics
      });
    });

    it('should run overview health check successfully', async () => {
      const mockOverview = { overall: 'healthy', systemMetrics: {}, databaseHealth: {}, serviceHealth: {}, performanceMetrics: {}, lastChecked: new Date() };
      mockServiceInstance.getSystemHealthOverview.mockResolvedValue(mockOverview);
      mockRequest.body = { checkType: 'overview' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.getSystemHealthOverview).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        checkType: 'overview',
        timestamp: expect.any(String),
        result: mockOverview
      });
    });

    it('should return error for missing check type', async () => {
      mockRequest.body = {};

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Check type is required'
      });
    });

    it('should return error for invalid check type', async () => {
      mockRequest.body = { checkType: 'invalid' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid check type: invalid'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Health check failed');
      mockServiceInstance.getSystemMetrics.mockRejectedValue(error);
      mockRequest.body = { checkType: 'system' };

      await controller.runHealthCheck(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to run health check'
      });
    });
  });

  describe('getDependencyHealth', () => {
    it('should return dependency health successfully', async () => {
      const mockDbHealth = { status: 'healthy', responseTime: 25, lastChecked: new Date() };
      const mockServicesHealth = {
        redis: { status: 'healthy', responseTime: 5 },
        minio: { status: 'healthy', responseTime: 10 },
        elasticsearch: { status: 'unhealthy', responseTime: 0 }
      };

      mockServiceInstance.checkDatabaseHealth.mockResolvedValue(mockDbHealth);
      mockServiceInstance.checkServiceHealth.mockResolvedValue(mockServicesHealth);

      await controller.getDependencyHealth(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(mockServiceInstance.checkDatabaseHealth).toHaveBeenCalled();
      expect(mockServiceInstance.checkServiceHealth).toHaveBeenCalled();

      const expectedDependencies = {
        database: { name: 'PostgreSQL Database', ...mockDbHealth },
        redis: { name: 'Redis Cache', status: 'healthy', responseTime: 5, lastChecked: expect.any(Date) },
        minio: { name: 'MinIO Storage', status: 'healthy', responseTime: 10, lastChecked: expect.any(Date) },
        elasticsearch: { name: 'Elasticsearch', status: 'unhealthy', responseTime: 0, clusterHealth: undefined, lastChecked: expect.any(Date) }
      };

      expect(jsonSpy).toHaveBeenCalledWith({
        dependencies: expectedDependencies
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Dependency health check failed');
      mockServiceInstance.checkDatabaseHealth.mockRejectedValue(error);

      await controller.getDependencyHealth(mockRequest as Request & { admin: { id: string } }, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to check dependency health'
      });
    });
  });

  describe('getCpuMetrics, getMemoryMetrics, getDiskMetrics', () => {
    const mockSystemMetrics = {
      cpu: { usage: 40, loadAverage: [1.2, 1.5, 1.3], cores: 8 },
      memory: { total: 32768, used: 16384, free: 16384, usagePercentage: 50 },
      disk: { total: 2000000, used: 1000000, free: 1000000, usagePercentage: 50 }
    };

    beforeEach(() => {
      mockServiceInstance.getSystemMetrics.mockResolvedValue(mockSystemMetrics);
    });

    it('should return CPU metrics successfully', async () => {
      await controller.getCpuMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockServiceInstance.getSystemMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        currentLoad: 40,
        loadAverage: { '1min': 1.2, '5min': 1.5, '15min': 1.3 },
        cores: 8,
        uptime: expect.any(Number),
        uptimeFormatted: expect.any(String)
      });
    });

    it('should return memory metrics successfully', async () => {
      await controller.getMemoryMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockServiceInstance.getSystemMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        total: expect.any(String),
        used: expect.any(String),
        free: expect.any(String),
        usagePercentage: 50,
        totalBytes: 32768,
        usedBytes: 16384,
        freeBytes: 16384
      });
    });

    it('should return disk metrics successfully', async () => {
      await controller.getDiskMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockServiceInstance.getSystemMetrics).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        total: expect.any(String),
        used: expect.any(String),
        free: expect.any(String),
        usagePercentage: 50,
        totalBytes: 2000000,
        usedBytes: 1000000,
        freeBytes: 1000000
      });
    });

    it('should handle service errors for CPU metrics', async () => {
      const error = new Error('CPU metrics failed');
      mockServiceInstance.getSystemMetrics.mockRejectedValue(error);

      await controller.getCpuMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve CPU metrics'
      });
    });

    it('should handle service errors for memory metrics', async () => {
      const error = new Error('Memory metrics failed');
      mockServiceInstance.getSystemMetrics.mockRejectedValue(error);

      await controller.getMemoryMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve memory metrics'
      });
    });

    it('should handle service errors for disk metrics', async () => {
      const error = new Error('Disk metrics failed');
      mockServiceInstance.getSystemMetrics.mockRejectedValue(error);

      await controller.getDiskMetrics(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve disk metrics'
      });
    });
  });
});