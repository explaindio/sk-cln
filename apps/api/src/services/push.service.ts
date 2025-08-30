import webpush from 'web-push';
import { prisma } from '../lib/prisma';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

export class PushService {
  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    // Only set VAPID details if both keys are provided and valid
    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(
          process.env.PUSH_SUBJECT || 'mailto:admin@example.com',
          publicKey,
          privateKey
        );
      } catch (error) {
        console.warn('Failed to set VAPID details:', error);
      }
    }
  }
  
  async sendNotification(subscription: any, payload: PushPayload) {
    try {
      // Check if VAPID keys are configured
      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('VAPID keys not configured. Skipping push notification.');
        return;
      }
      
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      if (error.statusCode === 410) {
        await this.removeSubscription(subscription.endpoint);
      }
      throw error;
    }
  }
  
  async subscribe(userId: string, subscription: any) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { keys: subscription.keys },
      create: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    });
  }
  
  async unsubscribe(endpoint: string) {
    return this.removeSubscription(endpoint);
  }
  
  private async removeSubscription(endpoint: string) {
    return prisma.pushSubscription.delete({
      where: { endpoint },
    });
  }
  
  async sendToUser(userId: string, payload: PushPayload) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    
    const results = await Promise.allSettled(
      subscriptions.map(sub => this.sendNotification(sub, payload))
    );
    
    return results.filter(r => r.status === 'fulfilled').length;
  }
}

export const pushService = new PushService();