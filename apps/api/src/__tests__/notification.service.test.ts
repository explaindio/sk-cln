import { PrismaClient, NotificationType } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { PushService } from '../services/push.service';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

// Mock the email service
jest.mock('../services/email.service', () => ({
  emailService: {
    queueEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock the push service
jest.mock('../services/push.service', () => ({
  pushService: {
    sendNotification: jest.fn().mockResolvedValue(true),
  },
}));

// Mock the socket service
jest.mock('../services/socket.service', () => ({
  socketService: {
    sendNotification: jest.fn().mockResolvedValue(true),
  },
}));

describe('Notification System', () => {
  // Test data
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    passwordHash: 'passwordhash',
  };
  const anotherUser = {
    id: 'another-user-id',
    email: 'another@example.com',
    firstName: 'Another',
    lastName: 'User',
    username: 'anotheruser',
    passwordHash: 'passwordhash',
  };

  beforeAll(async () => {
    // Seed the database with test data
    await prisma.user.createMany({ data: [testUser, anotherUser], skipDuplicates: true });
  });

  afterAll(async () => {
    // Clean up the database
    const userIds = [testUser.id, anotherUser.id];
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.userPreferences.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.pushSubscription.deleteMany({
      where: { userId: { in: userIds } },
    });
    const posts = await prisma.post.findMany({
      where: { authorId: { in: userIds } },
      select: { id: true },
    });
    const postIds = posts.map((p) => p.id);
    await prisma.reaction.deleteMany({
      where: { postId: { in: postIds } },
    });
    await prisma.comment.deleteMany({
      where: { postId: { in: postIds } },
    });
    await prisma.post.deleteMany({
      where: { authorId: { in: userIds } },
    });
    const communities = await prisma.community.findMany({
      where: { ownerId: { in: userIds } },
      select: { id: true },
    });
    const communityIds = communities.map((c) => c.id);
    await prisma.category.deleteMany({
      where: { communityId: { in: communityIds } },
    });
    await prisma.community.deleteMany({
      where: { ownerId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await prisma.$disconnect();
  });

  describe('In-App Notifications', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        userId: testUser.id,
        type: NotificationType.POST_LIKED,
        title: 'Test notification',
        message: 'This is a test notification',
        actionUrl: '/test',
      };
      const notification = await notificationService.create(notificationData);
      expect(notification).toHaveProperty('id');
      if (notification) {
        expect(notification.message).toBe('This is a test notification');
      }
    });

    it('should mark a notification as read', async () => {
      const notification = await prisma.notification.findFirst({
        where: { userId: testUser.id },
      });
      if (!notification) throw new Error('No notification found');
      const updated = await notificationService.markAsRead(notification.id, testUser.id);
      expect(updated.read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      await notificationService.create({
        userId: testUser.id,
        type: NotificationType.POST_LIKED,
        title: 'Notification 1',
        message: 'This is notification 1',
        actionUrl: '/test3',
      });
      await notificationService.create({
        userId: testUser.id,
        type: NotificationType.POST_LIKED,
        title: 'Notification 2',
        message: 'This is notification 2',
        actionUrl: '/test4',
      });
      await notificationService.markAllAsRead(testUser.id);
      const unread = await prisma.notification.count({
        where: { userId: testUser.id, read: false },
      });
      expect(unread).toBe(0);
    });
  });

  describe('Email Notifications', () => {
    it('should queue an email notification', async () => {
      const notificationData = {
        userId: testUser.id,
        type: NotificationType.POST_LIKED,
        title: 'Test Email',
        message: 'This is a test email notification',
        actionUrl: '/test',
      };
      await notificationService.create(notificationData);
      expect(require('../services/email.service').emailService.queueEmail).toHaveBeenCalled();
    });
  });

  describe('Push Notifications', () => {
    it('should send a push notification', async () => {
      await prisma.pushSubscription.create({
        data: {
          userId: testUser.id,
          endpoint: 'test-endpoint',
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        },
      });
      const notificationData = {
        userId: testUser.id,
        type: NotificationType.POST_LIKED,
        title: 'Test Push',
        message: 'This is a test push notification',
        actionUrl: '/test',
      };
      await notificationService.create(notificationData);
      expect(require('../services/push.service').pushService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('Notification Triggers', () => {
    it('should notify post liked', async () => {
      // Clean up any existing notifications for this user and type
      await prisma.notification.deleteMany({
        where: {
          userId: testUser.id,
          type: NotificationType.POST_LIKED,
        },
      });

      const community = await prisma.community.create({
        data: {
          name: 'Test Community',
          slug: 'test-community',
          ownerId: testUser.id,
        },
      });
      const category = await prisma.category.create({
        data: {
          name: 'Test Category',
          communityId: community.id,
        },
      });
      const post = await prisma.post.create({
        data: {
          title: 'Test Post',
          content: 'This is a test post',
          authorId: testUser.id,
          communityId: community.id,
          categoryId: category.id,
        },
      });
      await notificationService.notifyPostLiked(post.id, anotherUser.id);
      const notification = await prisma.notification.findFirst({
        where: {
          userId: testUser.id,
          type: NotificationType.POST_LIKED,
        },
      });
      expect(notification).toBeTruthy();
      expect(notification?.message).toBe(`${anotherUser.username} liked your post in ${community.name}`);
    });

    it('should not notify if user likes their own post', async () => {
      const community = await prisma.community.create({
        data: {
          name: 'Test Community 2',
          slug: 'test-community-2',
          ownerId: testUser.id,
        },
      });
      const category = await prisma.category.create({
        data: {
          name: 'Test Category 2',
          communityId: community.id,
        },
      });
      const post = await prisma.post.create({
        data: {
          title: 'Test Post 2',
          content: 'This is a test post',
          authorId: testUser.id,
          communityId: community.id,
          categoryId: category.id,
        },
      });
      const beforeCount = await prisma.notification.count({
        where: {
          userId: testUser.id,
          type: NotificationType.POST_LIKED,
        },
      });
      await notificationService.notifyPostLiked(post.id, testUser.id);
      const afterCount = await prisma.notification.count({
        where: {
          userId: testUser.id,
          type: NotificationType.POST_LIKED,
        },
      });
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('Notification History and Archiving', () => {
    let testNotificationId: string;

    beforeAll(async () => {
      // Create a test notification
      const notification = await prisma.notification.create({
        data: {
          userId: testUser.id,
          type: NotificationType.POST_LIKED,
          title: 'Test notification for history',
          message: 'This is a test notification for history testing',
          actionUrl: '/test-history',
        },
      });
      testNotificationId = notification.id;
    });

    it('should get notification history', async () => {
      const history = await notificationService.getNotificationHistory(testUser.id);
      expect(history).toHaveProperty('notifications');
      expect(history).toHaveProperty('total');
      expect(Array.isArray(history.notifications)).toBe(true);
      expect(history.total).toBeGreaterThanOrEqual(1);
    });

    it('should archive old notifications', async () => {
      // First, mark the notification as read so it can be archived
      await prisma.notification.update({
        where: { id: testNotificationId },
        data: { read: true },
      });

      // Archive notifications
      const result = await notificationService.archiveOldNotifications(testUser.id, 0); // Archive all notifications
      expect(result).toHaveProperty('count');
      
      // Verify the notification is archived
      const notification = await prisma.notification.findUnique({
        where: { id: testNotificationId },
      });
      expect(notification).toBeTruthy();
      expect(notification?.data).toHaveProperty('archived', true);
    });

    it('should get archived notifications', async () => {
      const archived = await notificationService.getArchivedNotifications(testUser.id);
      expect(archived).toHaveProperty('notifications');
      expect(archived).toHaveProperty('total');
      expect(Array.isArray(archived.notifications)).toBe(true);
      expect(archived.notifications.length).toBeGreaterThanOrEqual(1);
      
      // Verify that at least one notification has the archived flag
      const hasArchived = archived.notifications.some(notification =>
        notification.data &&
        typeof notification.data === 'object' &&
        !Array.isArray(notification.data) &&
        (notification.data as any).archived === true
      );
      expect(hasArchived).toBe(true);
    });
  });

  describe('Additional Notification Types', () => {
    it('should create a level up notification', async () => {
      const notificationData = {
        userId: testUser.id,
        type: NotificationType.LEVEL_UP,
        title: 'Level Up!',
        message: 'Congratulations! You\'ve reached level 5',
        actionUrl: '/profile',
        data: { newLevel: 5 },
      };
      
      const notification = await notificationService.create(notificationData);
      expect(notification).toHaveProperty('id');
      expect(notification?.type).toBe(NotificationType.LEVEL_UP);
      expect(notification?.data).toHaveProperty('newLevel', 5);
    });

    it('should create a points earned notification', async () => {
      const notificationData = {
        userId: testUser.id,
        type: NotificationType.POINTS_EARNED,
        title: 'Points Earned',
        message: 'You earned 100 points for completing a lesson',
        actionUrl: '/gamification/points',
        data: { points: 100, reason: 'completing a lesson' },
      };
      
      const notification = await notificationService.create(notificationData);
      expect(notification).toHaveProperty('id');
      expect(notification?.type).toBe(NotificationType.POINTS_EARNED);
      expect(notification?.data).toHaveProperty('points', 100);
      expect(notification?.data).toHaveProperty('reason', 'completing a lesson');
    });

    it('should create an event updated notification', async () => {
      const community = await prisma.community.create({
        data: {
          name: 'Test Community',
          slug: 'test-community',
          ownerId: testUser.id,
        },
      });
      
      const event = await prisma.event.create({
        data: {
          title: 'Test Event',
          description: 'This is a test event',
          startsAt: new Date(),
          endsAt: new Date(),
          communityId: community.id,
          creatorId: testUser.id,
        },
      });
      
      await notificationService.notifyEventUpdated(event.id, testUser.id);
      
      const notification = await prisma.notification.findFirst({
        where: {
          userId: testUser.id,
          type: NotificationType.EVENT_UPDATED,
        },
      });
      
      expect(notification).toBeTruthy();
      expect(notification?.message).toContain('updated');
      expect(notification?.data).toHaveProperty('eventId', event.id);
    });
  });
});