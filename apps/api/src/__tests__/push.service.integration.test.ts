import { pushService } from '../services/push.service';
import { prisma } from '../lib/prisma';
import * as webpush from 'web-push';

// Mock webpush to avoid actual network calls
jest.mock('web-push');

describe('PushService Integration', () => {
  const userId = 'test-user-id';
  const subscription = {
    endpoint: 'https://example.com/push/endpoint',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key'
    }
  };

  beforeAll(async () => {
    // Clear any existing test data
    await prisma.pushSubscription.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pushSubscription.deleteMany({});
  });

  describe('sendNotification', () => {
    it('should successfully send a notification', async () => {
      // Mock webpush.sendNotification to resolve successfully
      (webpush.sendNotification as jest.Mock).mockResolvedValue({
        statusCode: 201,
        body: 'ok',
        headers: {}
      });

      const payload = {
        title: 'Test Notification',
        body: 'This is a test notification'
      };

      await expect(pushService.sendNotification(subscription, payload)).resolves.not.toThrow();
    });

    it('should remove subscription when receiving 410 status code', async () => {
      // First create a subscription
      await pushService.subscribe(userId, subscription);

      // Mock webpush.sendNotification to reject with 410 status
      const webPushError = new Error('Push failed');
      (webPushError as any).statusCode = 410;
      (webpush.sendNotification as jest.Mock).mockRejectedValue(webPushError);

      const payload = {
        title: 'Test Notification',
        body: 'This is a test notification'
      };

      // The service should handle the 410 error and remove the subscription
      await expect(pushService.sendNotification(subscription, payload)).rejects.toThrow('Push failed');

      // Verify the subscription was removed
      const result = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
      });
      
      expect(result).toBeNull();
    });
  });

  describe('sendToUser', () => {
    it('should send notifications to all user subscriptions and count successful sends', async () => {
      // Create multiple subscriptions for the user
      const subscriptions = [
        {
          endpoint: 'https://example.com/push/endpoint1',
          keys: {
            p256dh: 'test-p256dh-key1',
            auth: 'test-auth-key1'
          }
        },
        {
          endpoint: 'https://example.com/push/endpoint2',
          keys: {
            p256dh: 'test-p256dh-key2',
            auth: 'test-auth-key2'
          }
        }
      ];

      for (const sub of subscriptions) {
        await pushService.subscribe(userId, sub);
      }

      // Mock webpush.sendNotification to resolve successfully for the first call
      // and reject with a non-410 error for the second call
      (webpush.sendNotification as jest.Mock)
        .mockResolvedValueOnce({
          statusCode: 201,
          body: 'ok',
          headers: {}
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const payload = {
        title: 'Test Notification',
        body: 'This is a test notification'
      };

      const successfulSends = await pushService.sendToUser(userId, payload);
      
      // One should succeed, one should fail
      expect(successfulSends).toBe(1);
    });
  });
});