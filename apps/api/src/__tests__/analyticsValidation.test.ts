// skool-clone/apps/api/src/__tests__/analyticsValidation.test.ts
import {
  getMetricsSchema,
  getUserAnalyticsSchema,
  getContentMetricsSchema,
  exportDataSchema,
  customReportSchema,
  communityEngagementSchema,
  revenueTrackingSchema,
  contentTrendsSchema,
  subscribeToRealtimeSchema,
  unsubscribeFromRealtimeSchema,
  startRealtimeUpdatesSchema
} from '../middleware/validation/analytics';

describe('Analytics Validation Schemas', () => {
  describe('getMetricsSchema', () => {
    it('should validate valid date inputs', () => {
      const validData = {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T23:59:59.999Z'
      };

      expect(() => getMetricsSchema.parse(validData)).not.toThrow();
      expect(getMetricsSchema.parse(validData)).toEqual(validData);
    });

    it('should validate without dates (optional)', () => {
      const noDates = {};
      expect(() => getMetricsSchema.parse(noDates)).not.toThrow();
      expect(getMetricsSchema.parse(noDates)).toEqual(noDates);
    });

    it('should validate with partial dates', () => {
      const startDateOnly = { startDate: '2023-01-01T00:00:00.000Z' };
      expect(() => getMetricsSchema.parse(startDateOnly)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidData = { startDate: '2023-01-01' };
      expect(() => getMetricsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('getUserAnalyticsSchema', () => {
    it('should validate valid UUID', () => {
      const validData = { userId: '550e8400-e29b-41d4-a716-446655440000' };
      expect(() => getUserAnalyticsSchema.parse(validData)).not.toThrow();
      expect(getUserAnalyticsSchema.parse(validData)).toEqual(validData);
    });

    it('should reject invalid UUID', () => {
      const invalidData = { userId: 'not-a-uuid' };
      expect(() => getUserAnalyticsSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty userId', () => {
      const invalidData = { userId: '' };
      expect(() => getUserAnalyticsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('getContentMetricsSchema', () => {
    it('should validate valid post data', () => {
      const validData = {
        contentId: '550e8400-e29b-41d4-a716-446655440000',
        contentType: 'post'
      };
      expect(() => getContentMetricsSchema.parse(validData)).not.toThrow();
      expect(getContentMetricsSchema.parse(validData)).toEqual(validData);
    });

    it('should validate valid course data', () => {
      const validData = {
        contentId: '550e8400-e29b-41d4-a716-446655440000',
        contentType: 'course'
      };
      expect(() => getContentMetricsSchema.parse(validData)).not.toThrow();
      expect(getContentMetricsSchema.parse(validData)).toEqual(validData);
    });

    it('should reject invalid content type', () => {
      const invalidData = {
        contentId: '550e8400-e29b-41d4-a716-446655440000',
        contentType: 'invalid'
      };
      expect(() => getContentMetricsSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        contentId: 'not-a-uuid',
        contentType: 'post'
      };
      expect(() => getContentMetricsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('exportDataSchema', () => {
    it('should validate valid csv export data', () => {
      const validData = {
        type: 'users',
        format: 'csv',
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T23:59:59.999Z'
      };
      expect(() => exportDataSchema.parse(validData)).not.toThrow();
      expect(exportDataSchema.parse(validData)).toEqual(validData);
    });

    it('should validate valid json export data', () => {
      const validData = {
        type: 'users',
        format: 'json',
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T23:59:59.999Z'
      };
      expect(() => exportDataSchema.parse(validData)).not.toThrow();
    });

    it('should validate all valid export types', () => {
      const validTypes = ['users', 'payments', 'content'];
      validTypes.forEach(type => {
        const validData = {
          type,
          format: 'csv'
        };
        expect(() => exportDataSchema.parse(validData)).not.toThrow();
      });
    });

    it('should reject invalid export type', () => {
      const invalidData = {
        type: 'invalid',
        format: 'csv'
      };
      expect(() => exportDataSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid format', () => {
      const invalidData = {
        type: 'users',
        format: 'xml'
      };
      expect(() => exportDataSchema.parse(invalidData)).toThrow();
    });

    it('should accept optional dates', () => {
      const noDates = {
        type: 'users',
        format: 'csv'
      };
      expect(() => exportDataSchema.parse(noDates)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        type: 'users',
        format: 'csv',
        startDate: '2023-01-01'
      };
      expect(() => exportDataSchema.parse(invalidData)).toThrow();
    });
  });

  describe('customReportSchema', () => {
    it('should validate valid custom report data', () => {
      const validData = {
        name: 'Monthly Report',
        filters: { category: 'engagement' },
        metrics: ['users', 'posts', 'likes']
      };
      expect(() => customReportSchema.parse(validData)).not.toThrow();
      expect(customReportSchema.parse(validData)).toEqual({
        name: 'Monthly Report',
        filters: { category: 'engagement' },
        metrics: ['users', 'posts', 'likes']
      });
    });

    it('should validate report with minimal data', () => {
      const minimalData = {
        name: 'Simple Report',
        metrics: ['users']
      };
      expect(() => customReportSchema.parse(minimalData)).not.toThrow();
    });

    it('should validate report with no filters', () => {
      const noFiltersData = {
        name: 'No Filters',
        metrics: ['users', 'posts']
      };
      expect(() => customReportSchema.parse(noFiltersData)).not.toThrow();
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        metrics: ['users']
      };
      expect(() => customReportSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty metrics array', () => {
      const invalidData = {
        name: 'Test Report',
        metrics: []
      };
      expect(() => customReportSchema.parse(invalidData)).toThrow();
    });

    it('should reject non-string metrics', () => {
      const invalidData = {
        name: 'Test Report',
        metrics: ['users', 123, 'posts']
      };
      expect(() => customReportSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing name', () => {
      const invalidData = {
        metrics: ['users']
      };
      expect(() => customReportSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing metrics', () => {
      const invalidData = {
        name: 'Test Report'
      };
      expect(() => customReportSchema.parse(invalidData)).toThrow();
    });
  });

  describe('communityEngagementSchema', () => {
    it('should validate valid community engagement data', () => {
      const validData = {
        communityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T23:59:59.999Z'
      };
      expect(() => communityEngagementSchema.parse(validData)).not.toThrow();
      expect(communityEngagementSchema.parse(validData)).toEqual(validData);
    });

    it('should validate minimal data', () => {
      const minimalData = {
        communityId: '550e8400-e29b-41d4-a716-446655440000'
      };
      expect(() => communityEngagementSchema.parse(minimalData)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        communityId: 'not-a-uuid'
      };
      expect(() => communityEngagementSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        communityId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2023-01-01'
      };
      expect(() => communityEngagementSchema.parse(invalidData)).toThrow();
    });
  });

  describe('revenueTrackingSchema', () => {
    it('should validate valid revenue data', () => {
      const validData = {
        startDate: '2023-01-01T00:00:00.000Z',
        endDate: '2023-01-31T23:59:59.999Z'
      };
      expect(() => revenueTrackingSchema.parse(validData)).not.toThrow();
    });

    it('should validate minimal data', () => {
      const minimalData = {};
      expect(() => revenueTrackingSchema.parse(minimalData)).not.toThrow();
    });
  });

  describe('contentTrendsSchema', () => {
    it('should validate valid post trends data', () => {
      const validData = {
        contentType: 'post',
        days: 30
      };
      expect(() => contentTrendsSchema.parse(validData)).not.toThrow();
    });

    it('should validate valid course trends data', () => {
      const validData = {
        contentType: 'course',
        days: 14
      };
      expect(() => contentTrendsSchema.parse(validData)).not.toThrow();
    });

    it('should validate minimal data', () => {
      const minimalData = {
        contentType: 'post'
      };
      expect(() => contentTrendsSchema.parse(minimalData)).not.toThrow();
    });

    it('should validate with days at minimum', () => {
      const minDays = {
        contentType: 'post',
        days: 1
      };
      expect(() => contentTrendsSchema.parse(minDays)).not.toThrow();
    });

    it('should validate with days at maximum', () => {
      const maxDays = {
        contentType: 'post',
        days: 365
      };
      expect(() => contentTrendsSchema.parse(maxDays)).not.toThrow();
    });

    it('should reject invalid content type', () => {
      const invalidData = {
        contentType: 'invalid',
        days: 30
      };
      expect(() => contentTrendsSchema.parse(invalidData)).toThrow();
    });

    it('should reject days too low', () => {
      const tooLow = {
        contentType: 'post',
        days: 0
      };
      expect(() => contentTrendsSchema.parse(tooLow)).toThrow();
    });

    it('should reject days too high', () => {
      const tooHigh = {
        contentType: 'post',
        days: 400
      };
      expect(() => contentTrendsSchema.parse(tooHigh)).toThrow();
    });
  });

  describe('subscribeToRealtimeSchema', () => {
    it('should validate valid dashboard ID', () => {
      const validData = { dashboardId: 'dashboard-123' };
      expect(() => subscribeToRealtimeSchema.parse(validData)).not.toThrow();
    });

    it('should accept short dashboard ID', () => {
      const shortData = { dashboardId: 'ab' };
      expect(() => subscribeToRealtimeSchema.parse(shortData)).not.toThrow();
    });

    it('should accept long dashboard ID', () => {
      const longData = { dashboardId: 'a'.repeat(100) };
      expect(() => subscribeToRealtimeSchema.parse(longData)).not.toThrow();
    });

    it('should reject empty dashboard ID', () => {
      const emptyData = { dashboardId: '' };
      expect(() => subscribeToRealtimeSchema.parse(emptyData)).toThrow();
    });

    it('should reject dashboard ID too long', () => {
      const tooLongData = { dashboardId: 'a'.repeat(101) };
      expect(() => subscribeToRealtimeSchema.parse(tooLongData)).toThrow();
    });
  });

  describe('unsubscribeFromRealtimeSchema', () => {
    it('should validate valid dashboard ID', () => {
      const validData = { dashboardId: 'dashboard-123' };
      expect(() => unsubscribeFromRealtimeSchema.parse(validData)).not.toThrow();
    });
  });

  describe('startRealtimeUpdatesSchema', () => {
    it('should validate valid interval', () => {
      const validData = { interval: 30000 };
      expect(() => startRealtimeUpdatesSchema.parse(validData)).not.toThrow();
    });

    it('should validate minimum interval', () => {
      const minInterval = { interval: 1000 };
      expect(() => startRealtimeUpdatesSchema.parse(minInterval)).not.toThrow();
    });

    it('should validate maximum interval', () => {
      const maxInterval = { interval: 300000 };
      expect(() => startRealtimeUpdatesSchema.parse(maxInterval)).not.toThrow();
    });

    it('should accept no interval (optional)', () => {
      const noInterval = {};
      expect(() => startRealtimeUpdatesSchema.parse(noInterval)).not.toThrow();
    });

    it('should reject interval too low', () => {
      const tooLow = { interval: 500 };
      expect(() => startRealtimeUpdatesSchema.parse(tooLow)).toThrow();
    });

    it('should reject interval too high', () => {
      const tooHigh = { interval: 350000 };
      expect(() => startRealtimeUpdatesSchema.parse(tooHigh)).toThrow();
    });
  });
});