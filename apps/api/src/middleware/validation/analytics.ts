// skool-clone/apps/api/src/middleware/validation/analytics.ts
import { z } from 'zod';

// Schema for getting metrics
export const getMetricsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Schema for getting user analytics
export const getUserAnalyticsSchema = z.object({
  userId: z.string().uuid()
});

// Schema for getting content metrics
export const getContentMetricsSchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.enum(['post', 'course'])
});

// Schema for exporting data
export const exportDataSchema = z.object({
  type: z.enum(['users', 'payments', 'content']),
  format: z.enum(['csv', 'json']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Schema for custom reports
export const customReportSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.any()).optional(),
  metrics: z.array(z.string()).min(1)
});

// Schema for community engagement metrics
export const communityEngagementSchema = z.object({
  communityId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Schema for revenue tracking
export const revenueTrackingSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Schema for content trends
export const contentTrendsSchema = z.object({
  contentType: z.enum(['post', 'course']),
  days: z.number().min(1).max(365).optional()
});

// Schema for subscribing to real-time updates
export const subscribeToRealtimeSchema = z.object({
  dashboardId: z.string().min(1).max(100)
});

// Schema for unsubscribing from real-time updates
export const unsubscribeFromRealtimeSchema = z.object({
  dashboardId: z.string().min(1).max(100)
});

// Schema for starting real-time updates
export const startRealtimeUpdatesSchema = z.object({
  interval: z.number().min(1000).max(300000).optional() // 1 second to 5 minutes
});