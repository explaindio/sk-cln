// skool-clone/apps/api/src/__tests__/realtimeAnalyticsController.test.ts
import { Request, Response } from 'express';
import { RealtimeAnalyticsController } from '../controllers/realtimeAnalyticsController';

// Mock the analytics services
jest.mock('@sk-clone/analytics', () => ({
  realtimeAnalyticsService: {
    subscribeToDashboard: jest.fn(),
    unsubscribeFromDashboard: jest.fn(),
    startRealtimeUpdates: jest.fn(),
    stopRealtimeUpdates: jest.fn()
  }
}));

jest.mock('../services/socket.service', () => ({
  socketService: {}
}));

import { realtimeAnalyticsService } from '@sk-clone/analytics';

const mockRealtimeAnalyticsService = realtimeAnalyticsService as any;

describe('RealtimeAnalyticsController', () => {
  let controller: RealtimeAnalyticsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    controller = new RealtimeAnalyticsController();

    mockRequest = {
      user: { id: 'user123' }
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    jsonSpy = mockResponse.json as jest.SpyInstance;
    statusSpy = mockResponse.status as jest.SpyInstance;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('subscribeToRealtime', () => {
    it('should subscribe to real-time analytics successfully', async () => {
      mockRealtimeAnalyticsService.subscribeToDashboard.mockResolvedValue(undefined);

      mockRequest.body = { dashboardId: 'dashboard123' };

      await controller.subscribeToRealtime(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeAnalyticsService.subscribeToDashboard).toHaveBeenCalledWith('user123', 'dashboard123');
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Subscribed to real-time updates for dashboard dashboard123'
      });
    });

    it('should handle empty dashboardId', async () => {
      mockRequest.body = { dashboardId: '   ' };

      await controller.subscribeToRealtime(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard ID is required and must be a non-empty string'
      });
    });

    it('should handle undefined dashboardId', async () => {
      mockRequest.body = {};

      await controller.subscribeToRealtime(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard ID is required and must be a non-empty string'
      });
    });

    it('should handle non-string dashboardId', async () => {
      mockRequest.body = { dashboardId: 123 };

      await controller.subscribeToRealtime(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard ID is required and must be a non-empty string'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Subscription failed');
      mockRealtimeAnalyticsService.subscribeToDashboard.mockRejectedValue(error);

      mockRequest.body = { dashboardId: 'dashboard123' };

      await controller.subscribeToRealtime(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to subscribe to real-time analytics'
      });
    });
  });

  describe('unsubscribeFromRealtime', () => {
    it('should unsubscribe from real-time analytics successfully', async () => {
      mockRealtimeAnalyticsService.unsubscribeFromDashboard.mockResolvedValue(undefined);

      mockRequest.body = { dashboardId: 'dashboard123' };

      await controller.unsubscribeFromRealtime(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeAnalyticsService.unsubscribeFromDashboard).toHaveBeenCalledWith('user123', 'dashboard123');
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Unsubscribed from real-time updates for dashboard dashboard123'
      });
    });

    it('should handle empty dashboardId', async () => {
      mockRequest.body = { dashboardId: '' };

      await controller.unsubscribeFromRealtime(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard ID is required and must be a non-empty string'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Unsubscription failed');
      mockRealtimeAnalyticsService.unsubscribeFromDashboard.mockRejectedValue(error);

      mockRequest.body = { dashboardId: 'dashboard123' };

      await controller.unsubscribeFromRealtime(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to unsubscribe from real-time analytics'
      });
    });
  });

  describe('getDashboardData', () => {
    it('should return mock dashboard data (since no method exists)', async () => {
      mockRequest.params = { dashboardId: 'dashboard123' };

      await controller.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: {
          message: expect.stringContaining('Dashboard data for dashboard123')
        }
      });
    });

    it('should handle empty dashboardId', async () => {
      mockRequest.params = { dashboardId: '' };

      await controller.getDashboardData(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Dashboard ID is required and must be a non-empty string'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { dashboardId: 'dashboard123' };

      // Simulate an error by mocking the response object to throw during response
      mockResponse.json = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await controller.getDashboardData(mockRequest as Request, mockResponse as Response);
      } catch {
        // Expected error handling
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('startRealtimeUpdates', () => {
    it('should start real-time analytics updates successfully with default interval', async () => {
      mockRealtimeAnalyticsService.startRealtimeUpdates.mockResolvedValue(undefined);

      mockRequest.body = {};

      await controller.startRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeAnalyticsService.startRealtimeUpdates).toHaveBeenCalledWith(30000);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Real-time analytics updates started'
      });
    });

    it('should start real-time analytics updates successfully with custom interval', async () => {
      mockRealtimeAnalyticsService.startRealtimeUpdates.mockResolvedValue(undefined);

      mockRequest.body = { interval: '15000' };

      await controller.startRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeAnalyticsService.startRealtimeUpdates).toHaveBeenCalledWith(15000);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Real-time analytics updates started'
      });
    });

    it('should handle invalid interval string', async () => {
      mockRequest.body = { interval: 'invalid' };

      await controller.startRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid interval. Must be between 1000ms (1 second) and 300000ms (5 minutes)'
      });
    });

    it('should handle interval too low', async () => {
      mockRequest.body = { interval: '500' };

      await controller.startRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid interval. Must be between 1000ms (1 second) and 300000ms (5 minutes)'
      });
    });

    it('should handle interval too high', async () => {
      mockRequest.body = { interval: '350000' };

      await controller.startRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid interval. Must be between 1000ms (1 second) and 300000ms (5 minutes)'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to start updates');
      mockRealtimeAnalyticsService.startRealtimeUpdates.mockRejectedValue(error);

      mockRequest.body = {};

      await controller.startRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to start real-time analytics updates'
      });
    });
  });

  describe('stopRealtimeUpdates', () => {
    it('should stop real-time analytics updates successfully', async () => {
      mockRealtimeAnalyticsService.stopRealtimeUpdates.mockResolvedValue(undefined);

      await controller.stopRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(mockRealtimeAnalyticsService.stopRealtimeUpdates).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Real-time analytics updates stopped'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to stop updates');
      mockRealtimeAnalyticsService.stopRealtimeUpdates.mockRejectedValue(error);

      await controller.stopRealtimeUpdates(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to stop real-time analytics updates'
      });
    });
  });
});