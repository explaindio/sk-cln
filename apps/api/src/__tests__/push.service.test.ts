import { pushService } from '../services/push.service';
import { prisma } from '../lib/prisma';

describe('PushService', () => {
  beforeAll(async () => {
    // Clear any existing test data
    await prisma.pushSubscription.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.pushSubscription.deleteMany({});
  });

  describe('subscribe', () => {
    it('should create a new subscription', async () => {
      const userId = 'test-user-id';
      const subscription = {
        endpoint: 'https://example.com/push/endpoint1',
        keys: {
          p256dh: 'test-p256dh-key1',
          auth: 'test-auth-key1'
        }
      };

      const result = await pushService.subscribe(userId, subscription);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.endpoint).toBe(subscription.endpoint);
      expect(result.keys).toEqual(subscription.keys);
    });

    it('should update an existing subscription', async () => {
      const userId = 'test-user-id';
      const subscription = {
        endpoint: 'https://example.com/push/endpoint2',
        keys: {
          p256dh: 'test-p256dh-key2',
          auth: 'test-auth-key2'
        }
      };

      // First create the subscription
      await pushService.subscribe(userId, subscription);
      
      // Update the subscription with new keys
      const updatedSubscription = {
        ...subscription,
        keys: {
          p256dh: 'updated-p256dh-key',
          auth: 'updated-auth-key'
        }
      };

      const result = await pushService.subscribe(userId, updatedSubscription);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.endpoint).toBe(subscription.endpoint);
      expect(result.keys).toEqual(updatedSubscription.keys);
    });
  });

  describe('unsubscribe', () => {
    it('should remove a subscription', async () => {
      const subscription = {
        endpoint: 'https://example.com/push/endpoint3',
        keys: {
          p256dh: 'test-p256dh-key3',
          auth: 'test-auth-key3'
        }
      };

      // First create the subscription
      await pushService.subscribe('test-user-id', subscription);
      
      // Then remove it
      await pushService.unsubscribe(subscription.endpoint);
      
      // Verify it's been removed
      const result = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
      });
      
      expect(result).toBeNull();
    });
  });

  describe('sendToUser', () => {
    it('should send notifications to all user subscriptions', async () => {
      const userId = 'test-user-id-2';
      const subscriptions = [
        {
          endpoint: 'https://example.com/push/endpoint4',
          keys: {
            p256dh: 'test-p256dh-key4',
            auth: 'test-auth-key4'
          }
        },
        {
          endpoint: 'https://example.com/push/endpoint5',
          keys: {
            p256dh: 'test-p256dh-key5',
            auth: 'test-auth-key5'
          }
        }
      ];

      // Create subscriptions for the user
      for (const subscription of subscriptions) {
        await pushService.subscribe(userId, subscription);
      }

      const payload = {
        title: 'Test Notification',
        body: 'This is a test notification'
      };

      // Mock the sendNotification method to avoid actual network calls
      const sendNotificationSpy = jest.spyOn(pushService as any, 'sendNotification')
        .mockResolvedValue(undefined);

      const successfulSends = await pushService.sendToUser(userId, payload);
      
      expect(successfulSends).toBe(2);
      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);
      
      // Clean up mock
      sendNotificationSpy.mockRestore();
    });
  });
});