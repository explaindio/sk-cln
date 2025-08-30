import { Request, Response } from 'express';
import { featureFlagsController } from../../controllers/admin/featureFlags.controller';
import { prisma } from '../../lib/prisma';
import { featureFlagsService } from '../../services/admin/featureFlags.service';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../services/admin/featureFlags.service', () => ({
  featureFlagsService: {
    getFeatureFlags: jest.fn(),
    getFeatureFlag: jest.fn(),
    getFeatureFlagByKey: jest.fn(),
    createFeatureFlag: jest.fn(),
    updateFeatureFlag: jest.fn(),
    deleteFeatureFlag: jest.fn(),
    toggleFeatureFlag: jest.fn(),
    getExperiments: jest.fn(),
    createExperiment: jest.fn(),
    updateExperimentStatus: jest.fn(),
    addSegment: jest.fn(),
    updateSegment: jest.fn(),
    deleteSegment: jest.fn(),
    getFeatureFlagAnalytics: jest.fn(),
    getExperimentAnalytics: jest.fn(),
    evaluateFeatureFlag: jest.fn(),
    recordUsage: jest.fn(),
  },
}));

describe('FeatureFlagsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let sendSpy: jest.SpyInstance;

  beforeEach(() => {
    jsonSpy = jest.fn();
    sendSpy = jest.fn();

    mockResponse = {
      json: jsonSpy,
      status: jest.fn().mockReturnThis(),
      send: sendSpy,
    };

    mockRequest = {
      query: {},
      params: {},
      body: {},
      headers: {},
    };

    jest.clearAllMocks();
  });

  describe('getFeatureFlags', () => {
    it('should return paginated feature flags successfully', async () => {
      const mockResult = {
        data: [
          {
            id: '1',
            name: 'New Dashboard',
            key: 'new-dashboard',
            value: true,
            isActive: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      (featureFlagsService.getFeatureFlags as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.query = {
        includeArchived: 'false',
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.getFeatureFlags(adminRequest, mockResponse as Response);

      expect(featureFlagsService.getFeatureFlags).toHaveBeenCalledWith({
        includeArchived: false,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data, pagination: mockResult.pagination });
    });
  });

  describe('getFeatureFlag', () => {
    it('should return feature flag details successfully', async () => {
      const mockResult = {
        data: {
          id: '1',
          name: 'Feature One',
          key: 'feature-one',
          value: { enabled: true, percentage: 75 },
          description: 'A test feature',
        },
      };

      (featureFlagsService.getFeatureFlag as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { flagId: '1' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.getFeatureFlag(adminRequest, mockResponse as Response);

      expect(featureFlagsService.getFeatureFlag).toHaveBeenCalledWith('1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data });
    });

    it('should return 404 if feature flag not found', async () => {
      (featureFlagsService.getFeatureFlag as jest.Mock).mockRejectedValue(new Error('Feature flag not found'));

      mockRequest.params = { flagId: 'non-existent' };
      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.getFeatureFlag(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Feature flag not found',
      });
    });
  });

  describe('createFeatureFlag', () => {
    it('should create feature flag successfully', async () => {
      const mockResult = {
        data: {
          id: '1',
          name: 'New Feature',
          key: 'new-feature',
          value: true,
          defaultValue: false,
          isActive: true,
        },
      };

      (featureFlagsService.createFeatureFlag as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        name: 'New Feature',
        key: 'new-feature',
        value: true,
        defaultValue: false,
        description: 'A new feature flag',
        rolloutPercentage: 50,
        segments: [
          {
            name: 'Beta Users',
            type: 'user_list',
            conditions: { userIds: ['user1', 'user2'] },
          },
        ],
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.createFeatureFlag(adminRequest, mockResponse as Response);

      expect(featureFlagsService.createFeatureFlag).toHaveBeenCalledWith(
        {
          name: 'New Feature',
          key: 'new-feature',
          value: true,
          defaultValue: false,
          description: 'A new feature flag',
          rolloutPercentage: 50,
          segments: [
            {
              name: 'Beta Users',
              type: 'user_list',
              conditions: { userIds: ['user1', 'user2'] },
            },
          ],
        },
        'admin-id'
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        name: 'Missing Key',
        // missing key, value, defaultValue
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.createFeatureFlag(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Name, key, value, and defaultValue are required',
      });
    });

    it('should return 400 for invalid key format', async () => {
      mockRequest.body = {
        name: 'Invalid Key',
        key: 'invalid key with spaces', // invalid
        value: true,
        defaultValue: false,
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.createFeatureFlag(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Feature flag key can only contain letters, numbers, hyphens, and underscores',
      });
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag successfully', async () => {
      const mockResult = {
        data: {
          id: '1',
          name: 'Updated Feature',
          key: 'updated-feature',
          value: false,
          isActive: false,
        },
      };

      (featureFlagsService.updateFeatureFlag as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { flagId: '1' };
      mockRequest.body = {
        name: 'Updated Feature',
        value: false,
        isActive: false,
        rolloutPercentage: 25,
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.updateFeatureFlag(adminRequest, mockResponse as Response);

      expect(featureFlagsService.updateFeatureFlag).toHaveBeenCalledWith('1', {
        name: 'Updated Feature',
        value: false,
        isActive: false,
        rolloutPercentage: 25,
      }, 'admin-id');

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data });
    });

    it('should return 400 if flag ID missing', async () => {
      mockRequest.params = {};

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.updateFeatureFlag(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Feature flag ID is required',
      });
    });
  });

  describe('toggleFeatureFlag', () => {
    it('should toggle feature flag successfully', async () => {
      const mockResult = {
        data: {
          id: '1',
          name: 'Test Feature',
          key: 'test-feature',
          isActive: true,
        },
      };

      (featureFlagsService.toggleFeatureFlag as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { flagId: '1' };
      mockRequest.body = { isActive: true };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.toggleFeatureFlag(adminRequest, mockResponse as Response);

      expect(featureFlagsService.toggleFeatureFlag).toHaveBeenCalledWith('1', true, 'admin-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data });
    });

    it('should return 400 if isActive is not boolean', async () => {
      mockRequest.params = { flagId: '1' };
      mockRequest.body = { isActive: 'true' as any };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.toggleFeatureFlag(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'isActive must be a boolean',
      });
    });
  });

  describe('createExperiment', () => {
    it('should create experiment successfully', async () => {
      const mockResult = {
        data: {
          id: '1',
          name: 'Dashboard Experiment',
          featureFlagId: 'flag1',
          status: 'RUNNING',
        },
      };

      (featureFlagsService.createExperiment as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        name: 'Dashboard Experiment',
        description: 'A/B test for new dashboard',
        featureFlagId: 'flag1',
        variants: [
          { name: 'Control', value: false, percentage: 50 },
          { name: 'Treatment', value: true, percentage: 50 },
        ],
        startDate: '2023-08-01T00:00:00Z',
        endDate: '2023-08-31T23:59:59Z',
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.createExperiment(adminRequest, mockResponse as Response);

      expect(featureFlagsService.createExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dashboard Experiment',
          description: 'A/B test for new dashboard',
          featureFlagId: 'flag1',
          variants: [
            { name: 'Control', value: false, percentage: 50 },
            { name: 'Treatment', value: true, percentage: 50 },
          ],
        }),
        'admin-id'
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data });
    });

    it('should return 400 if required fields missing', async () => {
      mockRequest.body = {
        name: 'Invalid Experiment',
        // missing featureFlagId, variants
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.createExperiment(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Name, featureFlagId, and variants are required. Variants must be an array.',
      });
    });

    it('should validate variant percentages sum to 100', async () => {
      mockRequest.body = {
        name: 'Invalid Percentages',
        featureFlagId: 'flag1',
        variants: [
          { name: 'A', value: true, percentage: 30 },
          { name: 'B', value: false, percentage: 30 },
        ],
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.createExperiment(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Variant percentages must sum to 100',
      });
    });
  });

  describe('addSegment', () => {
    it('should add segment to feature flag successfully', async () => {
      const mockResult = {
        data: {
          id: '1',
          name: 'Premium Users',
          type: 'user_attribute',
          featureFlagId: 'flag1',
        },
      };

      (featureFlagsService.addSegment as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { flagId: 'flag1' };
      mockRequest.body = {
        name: 'Premium Users',
        type: 'user_attribute',
        conditions: { subscriptionTier: 'premium' },
        priority: 1,
      };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.addSegment(adminRequest, mockResponse as Response);

      expect(featureFlagsService.addSegment).toHaveBeenCalledWith(
        'flag1',
        {
          name: 'Premium Users',
          type: 'user_attribute',
          conditions: { subscriptionTier: 'premium' },
          priority: 1,
        },
        'admin-id'
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult.data });
    });
  });

  describe('getFeatureFlagAnalytics', () => {
    it('should return feature flag analytics successfully', async () => {
      const mockAnalytics = {
        usage: { total: 1000, uniqueUsers: 500 },
        conversionRate: 15.5,
        timeSeries: [
          { timestamp: '2023-08-01', users: 50 },
          { timestamp: '2023-08-02', users: 75 },
        ],
      };

      (featureFlagsService.getFeatureFlagAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      mockRequest.params = { key: 'test-feature' };
      mockRequest.query = { start: '2023-08-01', end: '2023-08-07' };

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.getFeatureFlagAnalytics(adminRequest, mockResponse as Response);

      expect(featureFlagsService.getFeatureFlagAnalytics).toHaveBeenCalledWith(
        'test-feature',
        { start: new Date('2023-08-01'), end: new Date('2023-08-07') }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockAnalytics });
    });

    it('should return 400 if feature flag key missing', async () => {
      mockRequest.params = {};

      const adminRequest = mockRequest as any;
      adminRequest.admin = { id: 'admin-id' };

      await featureFlagsController.getFeatureFlagAnalytics(adminRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Feature flag key is required',
      });
    });
  });

  describe('evaluateFeatureFlag', () => {
    it('should evaluate feature flag for user successfully', async () => {
      const mockResult = {
        enabled: true,
        value: { showNewFeature: true, percentage: 75 },
        rule: 'user_attribute',
        segmentId: 'segment1',
      };

      (featureFlagsService.evaluateFeatureFlag as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.params = { key: 'test-feature' };
      mockRequest.query = { userId: 'user1' };
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '192.168.1.1',
      };

      await featureFlagsController.evaluateFeatureFlag(mockRequest as Request, mockResponse as Response);

      expect(featureFlagsService.evaluateFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        'user1',
        { userAgent: 'Mozilla/5.0', ipAddress: '192.168.1.1' }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult });
    });
  });

  describe('recordUsage', () => {
    it('should record feature flag usage successfully', async () => {
      const mockResult = { success: true };

      (featureFlagsService.recordUsage as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = {
        key: 'test-feature',
        userId: 'user1',
        variant: 'treatment',
        metadata: {
          action: 'click',
          page: '/dashboard',
          timestamp: new Date().toISOString(),
        },
      };

      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '192.168.1.1',
      };

      await featureFlagsController.recordUsage(mockRequest as Request, mockResponse as Response);

      expect(featureFlagsService.recordUsage).toHaveBeenCalledWith(
        'test-feature',
        'user1',
        'treatment',
        expect.any(Object),
        { userAgent: 'Mozilla/5.0', ipAddress: '192.168.1.1' }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({ data: mockResult });
    });

    it('should return 400 if required fields missing', async () => {
      mockRequest.body = {
        key: 'test-feature',
        userId: 'user1',
        // missing metadata or metadata.action
      };

      await featureFlagsController.recordUsage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Key, userId, and metadata with action are required',
      });
    });
  });
});