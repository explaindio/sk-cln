// skool-clone/apps/api/src/controllers/realtimeAnalyticsController.ts
import { Request, Response } from 'express';
import { realtimeAnalyticsService } from '@sk-clone/analytics';
import { socketService } from '../services/socket.service';

export class RealtimeAnalyticsController {
  /**
   * Subscribe to real-time analytics updates
   */
  async subscribeToRealtime(req: Request, res: Response) {
    try {
      const { dashboardId } = req.body;
      const userId = req.user.id;
      
      // Validate dashboardId
      if (!dashboardId || typeof dashboardId !== 'string' || dashboardId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard ID is required and must be a non-empty string'
        });
      }
      
      // Subscribe user to real-time updates
      realtimeAnalyticsService.subscribeToDashboard(userId, dashboardId.trim());
      
      res.json({
        success: true,
        message: `Subscribed to real-time updates for dashboard ${dashboardId}`
      });
    } catch (error) {
      console.error('Failed to subscribe to real-time analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to subscribe to real-time analytics'
      });
    }
  }

  /**
   * Unsubscribe from real-time analytics updates
   */
  async unsubscribeFromRealtime(req: Request, res: Response) {
    try {
      const { dashboardId } = req.body;
      const userId = req.user.id;
      
      // Validate dashboardId
      if (!dashboardId || typeof dashboardId !== 'string' || dashboardId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard ID is required and must be a non-empty string'
        });
      }
      
      // Unsubscribe user from real-time updates
      realtimeAnalyticsService.unsubscribeFromDashboard(userId, dashboardId.trim());
      
      res.json({
        success: true,
        message: `Unsubscribed from real-time updates for dashboard ${dashboardId}`
      });
    } catch (error) {
      console.error('Failed to unsubscribe from real-time analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe from real-time analytics'
      });
    }
  }

  /**
   * Get initial dashboard data
   */
  async getDashboardData(req: Request, res: Response) {
    try {
      const { dashboardId } = req.params;
      const userId = req.user.id;
      
      // Validate dashboardId
      if (!dashboardId || typeof dashboardId !== 'string' || dashboardId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard ID is required and must be a non-empty string'
        });
      }
      
      // Get initial dashboard data
      // Note: This method doesn't exist in the current implementation
      // We'll implement a simple version for now
      const dashboardData = {
        message: `Dashboard data for ${dashboardId} would be returned here`
      };
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }

  /**
   * Start real-time analytics updates (admin only)
   */
  async startRealtimeUpdates(req: Request, res: Response) {
    try {
      const { interval } = req.body;
      
      // Validate interval
      const intervalNum = interval ? parseInt(interval as string) : 30000;
      if (isNaN(intervalNum) || intervalNum < 1000 || intervalNum > 300000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid interval. Must be between 1000ms (1 second) and 300000ms (5 minutes)'
        });
      }
      
      // Initialize realtime analytics service with socket.io instance
      (realtimeAnalyticsService as any).io = socketService;
      
      // Start real-time updates
      realtimeAnalyticsService.startRealtimeUpdates(intervalNum);
      
      res.json({
        success: true,
        message: 'Real-time analytics updates started'
      });
    } catch (error) {
      console.error('Failed to start real-time analytics updates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start real-time analytics updates'
      });
    }
  }

  /**
   * Stop real-time analytics updates (admin only)
   */
  async stopRealtimeUpdates(req: Request, res: Response) {
    try {
      // Stop real-time updates
      realtimeAnalyticsService.stopRealtimeUpdates();
      
      res.json({
        success: true,
        message: 'Real-time analytics updates stopped'
      });
    } catch (error) {
      console.error('Failed to stop real-time analytics updates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop real-time analytics updates'
      });
    }
  }
}

export const realtimeAnalyticsController = new RealtimeAnalyticsController();