import { featureFlagsController } from '../controllers/admin/featureFlags.controller';
import { featureFlagsService } from '../services/admin/featureFlags.service';

// Mock the service
jest.mock('../services/admin/featureFlags.service');

describe('FeatureFlagsController', () => {
  const mockAdmin = { id: 'admin-123', email: 'admin@example.com' };
  const mockRequest = {
    admin: mockAdmin,
    query: {},
    params: {},
    body: {},
    headers: {}
  } as any;
  const mockResponse = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis()
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFeatureFlags', () => {
    it('should return paginated feature flags successfully', async () => {
      const mockData = [
        { id: 'flag-1', name: 'Test Flag', key: 'test_flag', isActive: true },
        { id: 'flag-2', name: 'Another Flag', key: 'another_flag', isActive: false }
      ];
      const mockPagination = { page: 1, limit: 20, total: 2, pages: 1 };

      (featureFlagsService.getFeatureFlags as jest.Mock).mockResolvedValue({
        success: true,
        data: mockData,
        pagination: mockPagination
      });

      const result = await featureFlagsController.getFeatureFlags(mockRequest, mockResponse);

      expect(featureFlagsService.getFeatureFlags).toHaveBeenCalledWith({ includeArchived: false, page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
      expect(mockResponse.json).toHaveBeenCalledWith(mockData);
      expect(mockResponse.status).toHaveBeenCalledWith(undefined);
    });

    it('should handle query parameters correctly', async () => {
      mockRequest.query = {
        includeArchived: 'true',
        page: '2',
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc'
      };

      (featureFlagsService.getFeatureFlags as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
        pagination: { page: 2, limit: 10, total: 0, pages: 0 }
      });

      await featureFlagsController.getFeatureFlags(mockRequest, mockResponse);

      expect(featureFlagsService.getFeatureFlags).toHaveBeenCalledWith({
        includeArchived: true,
        page: 2,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      (featureFlagsService.getFeatureFlags as jest.Mock).mockRejectedValue(error);

      await featureFlagsController.getFeatureFlags(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch feature flags'
      });
    });
  });

  describe('getFeatureFlag', () => {
    it('should return feature flag details successfully', async () => {
      const mockFlagData = {
        id: 'flag-1',
        name: 'Test Flag',
        key: 'test_flag',
        description: 'A test flag',
        isActive: true,
        rolloutPercentage: 100,
        segments: [],
        experiments: []
      };

      mockRequest.params = { flagId: 'flag-1' };
      (featureFlagsService.getFeatureFlag as jest.Mock).mockResolvedValue({
        success: true,
        data: mockFlagData
      });

      await featureFlagsController.getFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.getFeatureFlag).toHaveBeenCalledWith('flag-1');
      expect(mockResponse.json).toHaveBeenCalledWith(mockFlagData);
      expect(mockResponse.status).toHaveBeenCalledWith(undefined);
    });

    it('should handle missing flag ID', async () => {
      mockRequest.params = {};

      await featureFlagsController.getFeatureFlag(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Feature flag ID is required'
      });
    });

    it('should handle not found error', async () => {
      mockRequest.params = { flagId: 'non-existent' };
      const error = new Error('Feature flag not found');
      (featureFlagsService.getFeatureFlag as jest.Mock).mockRejectedValue(error);

      await featureFlagsController.getFeatureFlag(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Feature flag not found'
      });
    });
  });

  describe('getFeatureFlagByKey', () => {
    it('should return feature flag by key successfully', async () => {
      const mockFlagData = {
        id: 'flag-1',
        name: 'Test Flag',
        key: 'test_flag'
      };

      mockRequest.params = { key: 'test_flag' };
      (featureFlagsService.getFeatureFlagByKey as jest.Mock).mockResolvedValue({
        success: true,
        data: mockFlagData
      });

      await featureFlagsController.getFeatureFlagByKey(mockRequest, mockResponse);

      expect(featureFlagsService.getFeatureFlagByKey).toHaveBeenCalledWith('test_flag');
      expect(mockResponse.json).toHaveBeenCalledWith(mockFlagData);
    });
  });

  describe('createFeatureFlag', () => {
    it('should create feature flag successfully', async () => {
      const requestData = {
        name: 'New Feature Flag',
        key: 'new_feature_flag',
        description: 'A new feature',
        value: true,
        defaultValue: false,
        rolloutPercentage: 50,
        userIds: ['user-1']
      };

      const createdFlag = {
        id: 'flag-new',
        ...requestData,
        isActive: true
      };

      mockRequest.body = requestData;
      (featureFlagsService.createFeatureFlag as jest.Mock).mockResolvedValue({
        success: true,
        data: createdFlag
      });

      await featureFlagsController.createFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.createFeatureFlag).toHaveBeenCalledWith(requestData, 'admin-123');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(createdFlag);
    });

    it('should handle validation errors', async () => {
      const testCases = [
        { body: { key: 'test' }, error: 'Name, key, value, and defaultValue are required' },
        { body: { name: 'test', key: 'test' }, error: 'Name, key, value, and defaultValue are required' },
        { body: { name: 'test', key: 'test', value: true }, error: 'Name, key, value, and defaultValue are required' },
        { body: { name: 'test', key: 'test value', value: true, defaultValue: false }, error: 'Feature flag key can only contain letters, numbers, hyphens, and underscores' },
        { body: { name: 'test', key: 'test_value', value: true, defaultValue: false, rolloutPercentage: 150 }, error: 'Rollout percentage must be between 0 and 100' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = testCase.body;

        await featureFlagsController.createFeatureFlag(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: testCase.error
        });
      }
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag successfully', async () => {
      const updateData = {
        name: 'Updated Flag',
        description: 'Updated description'
      };

      const updatedFlag = {
        id: 'flag-1',
        name: 'Updated Flag',
        key: 'test_flag',
        description: 'Updated description'
      };

      mockRequest.params = { flagId: 'flag-1' };
      mockRequest.body = updateData;
      (featureFlagsService.updateFeatureFlag as jest.Mock).mockResolvedValue({
        success: true,
        data: updatedFlag
      });

      await featureFlagsController.updateFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.updateFeatureFlag).toHaveBeenCalledWith('flag-1', updateData, 'admin-123');
      expect(mockResponse.json).toHaveBeenCalledWith(updatedFlag);
    });

    it('should remove undefined values from updates', async () => {
      const updateData = {
        name: 'Updated Flag',
        description: null,
        rolloverPercentage: undefined
      };

      mockRequest.params = { flagId: 'flag-1' };
      mockRequest.body = updateData;
      (featureFlagsService.updateFeatureFlag as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'flag-1', name: 'Updated Flag' }
      });

      await featureFlagsController.updateFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.updateFeatureFlag).toHaveBeenCalledWith('flag-1', { name: 'Updated Flag' }, 'admin-123');
    });
  });

  describe('deleteFeatureFlag', () => {
    it('should delete feature flag successfully', async () => {
      mockRequest.params = { flagId: 'flag-1' };
      (featureFlagsService.deleteFeatureFlag as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Feature flag archived successfully'
      });

      await featureFlagsController.deleteFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.deleteFeatureFlag).toHaveBeenCalledWith('flag-1', 'admin-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag archived successfully'
      });
    });
  });

  describe('toggleFeatureFlag', () => {
    it('should toggle feature flag active status successfully', async () => {
      const toggledFlag = {
        id: 'flag-1',
        name: 'Test Flag',
        key: 'test_flag',
        isActive: false
      };

      mockRequest.params = { flagId: 'flag-1' };
      mockRequest.body = { isActive: false };
      (featureFlagsService.toggleFeatureFlag as jest.Mock).mockResolvedValue({
        success: true,
        data: toggledFlag
      });

      await featureFlagsController.toggleFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.toggleFeatureFlag).toHaveBeenCalledWith('flag-1', false, 'admin-123');
      expect(mockResponse.json).toHaveBeenCalledWith(toggledFlag);
    });

    it('should validate isActive parameter', async () => {
      mockRequest.params = { flagId: 'flag-1' };
      mockRequest.body = { isActive: 'invalid' };

      await featureFlagsController.toggleFeatureFlag(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'isActive must be a boolean'
      });
    });
  });

  describe('getExperiments', () => {
    it('should return experiments successfully', async () => {
      const mockExperiments = [
        { id: 'exp-1', name: 'Test Experiment', status: 'RUNNING' }
      ];

      (featureFlagsService.getExperiments as jest.Mock).mockResolvedValue({
        success: true,
        data: mockExperiments
      });

      await featureFlagsController.getExperiments(mockRequest, mockResponse);

      expect(featureFlagsService.getExperiments).toHaveBeenCalledWith(undefined);
      expect(mockResponse.json).toHaveBeenCalledWith(mockExperiments);
    });

    it('should handle feature flag specific experiments', async () => {
      mockRequest.query = { featureFlagId: 'flag-1' };

      await featureFlagsController.getExperiments(mockRequest, mockResponse);

      expect(featureFlagsService.getExperiments).toHaveBeenCalledWith('flag-1');
    });
  });

  describe('createExperiment', () => {
    it('should create experiment successfully', async () => {
      const experimentData = {
        name: 'New Experiment',
        featureFlagId: 'flag-1',
        variants: [
          { name: 'variant-a', value: true, percentage: 50 },
          { name: 'variant-b', value: false, percentage: 50 }
        ]
      };

      const createdExperiment = {
        id: 'exp-new',
        ...experimentData
      };

      mockRequest.body = experimentData;
      (featureFlagsService.createExperiment as jest.Mock).mockResolvedValue({
        success: true,
        data: createdExperiment
      });

      await featureFlagsController.createExperiment(mockRequest, mockResponse);

      expect(featureFlagsService.createExperiment).toHaveBeenCalledWith({
        ...experimentData,
        startDate: new Date(experimentData.startDate),
        endDate: experimentData.endDate ? new Date(experimentData.endDate) : undefined
      }, 'admin-123');
    });

    it('should validate experiment data', async () => {
      const testCases = [
        { body: {}, error: 'Name, featureFlagId, and variants are required. Variants must be an array.' },
        { body: { name: 'test' }, error: 'Name, featureFlagId, and variants are required. Variants must be an array.' },
        { body: { name: 'test', featureFlagId: 'flag-1' }, error: 'Name, featureFlagId, and variants are required. Variants must be an array.' },
        { body: { name: 'test', featureFlagId: 'flag-1', variants: [] }, error: 'At least one variant is required' },
        { body: {
          name: 'test',
          featureFlagId: 'flag-1',
          variants: [{ name: 'test', percentage: 150 }]
        }, error: 'Variant percentage must be between 0 and 100' }
      ];

      for (const testCase of testCases) {
        mockRequest.body = testCase.body;

        await featureFlagsController.createExperiment(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: testCase.error
        });
      }
    });
  });

  describe('updateExperimentStatus', () => {
    it('should update experiment status successfully', async () => {
      const updatedExperiment = {
        id: 'exp-1',
        name: 'Test Experiment',
        status: 'COMPLETED'
      };

      mockRequest.params = { experimentId: 'exp-1' };
      mockRequest.body = { status: 'COMPLETED' };
      (featureFlagsService.updateExperimentStatus as jest.Mock).mockResolvedValue({
        success: true,
        data: updatedExperiment
      });

      await featureFlagsController.updateExperimentStatus(mockRequest, mockResponse);

      expect(featureFlagsService.updateExperimentStatus).toHaveBeenCalledWith('exp-1', 'COMPLETED', 'admin-123');
      expect(mockResponse.json).toHaveBeenCalledWith(updatedExperiment);
    });
  });

  describe('addSegment', () => {
    it('should add segment successfully', async () => {
      const segmentData = {
        name: 'New Segment',
        type: 'USER_BASED',
        conditions: { rule: 'userType', value: ['premium'] }
      };

      mockRequest.params = { flagId: 'flag-1' };
      mockRequest.body = segmentData;
      (featureFlagsService.addSegment as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'segment-new', ...segmentData }
      });

      await featureFlagsController.addSegment(mockRequest, mockResponse);

      expect(featureFlagsService.addSegment).toHaveBeenCalledWith('flag-1', {
        ...segmentData,
        priority: 0
      }, 'admin-123');
    });

    it('should validate segment data', async () => {
      const testCases = [
        { body: {}, error: 'Name, type, and conditions are required' },
        { body: { name: 'test' }, error: 'Name, type, and conditions are required' },
        { body: { name: 'test', type: 'INVALID_TYPE' }, error: 'Invalid segment type: INVALID_TYPE' }
      ];

      for (const testCase of testCases) {
        mockRequest.params = { flagId: 'flag-1' };
        mockRequest.body = testCase.body;

        await featureFlagsController.addSegment(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: testCase.error
        });
      }
    });
  });

  describe('updateSegment', () => {
    it('should update segment successfully', async () => {
      const updateData = {
        name: 'Updated Segment',
        isActive: true
      };

      mockRequest.params = { segmentId: 'segment-1' };
      mockRequest.body = updateData;
      (featureFlagsService.updateSegment as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'segment-1', ...updateData }
      });

      await featureFlagsController.updateSegment(mockRequest, mockResponse);

      expect(featureFlagsService.updateSegment).toHaveBeenCalledWith('segment-1', updateData, 'admin-123');
    });
  });

  describe('deleteSegment', () => {
    it('should delete segment successfully', async () => {
      mockRequest.params = { segmentId: 'segment-1' };
      (featureFlagsService.deleteSegment as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Segment deleted successfully'
      });

      await featureFlagsController.deleteSegment(mockRequest, mockResponse);

      expect(featureFlagsService.deleteSegment).toHaveBeenCalledWith('segment-1', 'admin-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Segment deleted successfully'
      });
    });
  });

  describe('getFeatureFlagAnalytics', () => {
    it('should return feature flag analytics successfully', async () => {
      const mockAnalytics = {
        totalUsages: 1000,
        uniqueUsers: 500,
        conversionRate: 0.8,
        variantPerformance: [],
        usageOverTime: []
      };

      mockRequest.params = { key: 'test_flag' };
      (featureFlagsService.getFeatureFlagAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      await featureFlagsController.getFeatureFlagAnalytics(mockRequest, mockResponse);

      expect(featureFlagsService.getFeatureFlagAnalytics).toHaveBeenCalledWith('test_flag', undefined);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAnalytics);
    });

    it('should handle date range parameters', async () => {
      const dateRange = { start: '2024-01-01', end: '2024-01-31' };
      mockRequest.params = { key: 'test_flag' };
      mockRequest.query = dateRange;

      await featureFlagsController.getFeatureFlagAnalytics(mockRequest, mockResponse);

      expect(featureFlagsService.getFeatureFlagAnalytics).toHaveBeenCalledWith('test_flag', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      });
    });
  });

  describe('getExperimentAnalytics', () => {
    it('should return experiment analytics successfully', async () => {
      const mockAnalytics = {
        totalParticipants: 100,
        variantDistribution: [
          { variant: 'variant-a', count: 50, percentage: 50 },
          { variant: 'variant-b', count: 50, percentage: 50 }
        ],
        metrics: []
      };

      mockRequest.params = { experimentId: 'exp-1' };
      (featureFlagsService.getExperimentAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      await featureFlagsController.getExperimentAnalytics(mockRequest, mockResponse);

      expect(featureFlagsService.getExperimentAnalytics).toHaveBeenCalledWith('exp-1');
      expect(mockResponse.json).toHaveBeenCalledWith(mockAnalytics);
    });
  });

  describe('evaluateFeatureFlag', () => {
    it('should evaluate feature flag successfully', async () => {
      const evaluationResult = {
        success: true,
        enabled: true,
        value: 'test-value',
        reason: 'Direct targeting'
      };

      mockRequest.params = { key: 'test_flag' };
      mockRequest.query = { userId: 'user-1' };
      mockRequest.headers = { 'user-agent': 'Test/1.0', 'x-forwarded-for': '192.168.1.1' };
      (featureFlagsService.evaluateFeatureFlag as jest.Mock).mockResolvedValue(evaluationResult);

      await featureFlagsController.evaluateFeatureFlag(mockRequest, mockResponse);

      expect(featureFlagsService.evaluateFeatureFlag).toHaveBeenCalledWith('test_flag', 'user-1', {
        userAgent: 'Test/1.0',
        ipAddress: '192.168.1.1'
      });
      expect(mockResponse.json).toHaveBeenCalledWith(evaluationResult);
    });

    it('should handle missing key parameter', async () => {
      mockRequest.params = {};

      await featureFlagsController.evaluateFeatureFlag(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Feature flag key is required'
      });
    });
  });

  describe('recordUsage', () => {
    it('should record usage successfully', async () => {
      const usageData = {
        key: 'test_flag',
        userId: 'user-1',
        metadata: { action: 'view', page: 'home' }
      };

      mockRequest.body = usageData;
      mockRequest.headers = { 'user-agent': 'Test/1.0', 'x-forwarded-for': '192.168.1.1' };
      (featureFlagsService.recordUsage as jest.Mock).mockResolvedValue({
        success: true
      });

      await featureFlagsController.recordUsage(mockRequest, mockResponse);

      expect(featureFlagsService.recordUsage).toHaveBeenCalledWith('test_flag', 'user-1', undefined, usageData, {
        userAgent: 'Test/1.0',
        ipAddress: '192.168.1.1'
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true
      });
    });

    it('should validate required parameters', async () => {
      const testCases = [
        { body: {} },
        { body: { userId: 'user-1' } },
        { body: { userId: 'user-1', metadata: {} } },
        { body: { userId: 'user-1', metadata: { page: 'home' } } }
      ];

      for (const testCase of testCases) {
        mockRequest.body = testCase.body;

        await featureFlagsController.recordUsage(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          error: 'Key, userId, and metadata with action are required'
        });
      }
    });
  });
});