import { prisma } from '../lib/prisma';
import { NotificationType } from '@prisma/client';
import { emailService } from './email.service';
import { pushService } from './push.service';
import { socketService } from './socket.service';

// For rate limiting
const notificationRateLimit = new Map<string, { count: number; lastReset: Date }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_NOTIFICATIONS_PER_WINDOW = 10;

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  imageUrl?: string;
}

export class NotificationService {
  private checkRateLimit(userId: string): boolean {
    const now = new Date();
    const userLimit = notificationRateLimit.get(userId);
    
    if (!userLimit) {
      // First notification for this user in the window
      notificationRateLimit.set(userId, { count: 1, lastReset: now });
      return true;
    }
    
    // Check if we need to reset the window
    if (now.getTime() - userLimit.lastReset.getTime() > RATE_LIMIT_WINDOW) {
      notificationRateLimit.set(userId, { count: 1, lastReset: now });
      return true;
    }
    
    // Check if we've exceeded the limit
    if (userLimit.count >= MAX_NOTIFICATIONS_PER_WINDOW) {
      return false;
    }
    
    // Increment the count
    notificationRateLimit.set(userId, { count: userLimit.count + 1, lastReset: userLimit.lastReset });
    return true;
  }
  
  async create(notification: NotificationData) {
    // Check rate limit
    if (!this.checkRateLimit(notification.userId)) {
      console.warn(`Rate limit exceeded for user ${notification.userId}`);
      return null;
    }
    
    // Check user preferences
    const preferences = await this.getUserPreferences(notification.userId);

    // Check if DND is active
    if (this.isDNDActive(preferences)) {
      // Optionally, queue the notification to be sent later
      return;
    }

    // Create in-app notification
    const created = await prisma.notification.create({
      data: {
        ...notification,
        read: false,
      },
    });

    // Send real-time notification via WebSocket
    if (preferences.inAppEnabled) {
      socketService.sendNotification(notification.userId, created);
    }

    // Queue email notification if enabled
    if (this.shouldSendEmail(preferences, notification.type)) {
      await this.queueEmail(notification);
    }

    // Send push notification if enabled
    if (this.shouldSendPush(preferences, notification.type)) {
      await this.sendPushNotification(notification);
    }

    return created;
  }

  private isDNDActive(preferences: any): boolean {
    if (!preferences.dndEnabled || !preferences.dndStart || !preferences.dndEnd) {
      return false;
    }
    const now = new Date();
    const [startHour, startMinute] = preferences.dndStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.dndEnd.split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);

    if (endTime < startTime) { // Overnight DND
      return now >= startTime || now < endTime;
    }
    return now >= startTime && now < endTime;
  }

  async createBulk(notifications: NotificationData[]) {
    // Filter out notifications for users who have exceeded their rate limit
    const validNotifications = [];
    for (const notification of notifications) {
      if (this.checkRateLimit(notification.userId)) {
        validNotifications.push(notification);
      } else {
        console.warn(`Rate limit exceeded for user ${notification.userId} in batch, skipping notification`);
      }
    }
    
    if (validNotifications.length === 0) {
      return { count: 0 };
    }

    const created = await prisma.notification.createMany({
      data: validNotifications.map(n => ({ ...n, read: false })),
    });

    // Send real-time notifications
    for (const notification of validNotifications) {
      // Check user preferences before sending
      const preferences = await this.getUserPreferences(notification.userId);
      if (preferences.inAppEnabled) {
        socketService.sendNotification(notification.userId, notification);
      }
    }

    return created;
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ) {
    const where = {
      userId,
      ...(unreadOnly && { read: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  async deleteNotification(notificationId: string, userId: string) {
    return prisma.notification.delete({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
    });
  }

   async deleteOldNotifications(daysOld: number = 30) {
     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - daysOld);
 
     return prisma.notification.deleteMany({
       where: {
         createdAt: {
           lt: cutoffDate,
         },
         read: true, // Only delete read notifications
       },
     });
   }
 
   async getNotificationHistory(
     userId: string,
     limit: number = 50,
     offset: number = 0,
     startDate?: Date,
     endDate?: Date
   ) {
     const where: any = { userId };
     
     if (startDate || endDate) {
       where.createdAt = {};
       if (startDate) where.createdAt.gte = startDate;
       if (endDate) where.createdAt.lte = endDate;
     }
 
     const [notifications, total] = await Promise.all([
       prisma.notification.findMany({
         where,
         orderBy: { createdAt: 'desc' },
         take: limit,
         skip: offset,
       }),
       prisma.notification.count({ where }),
     ]);
 
     return {
       notifications,
       total,
     };
   }
 
  async archiveOldNotifications(userId: string, daysOld: number = 30) {
     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - daysOld);
 
     // For archiving, we'll update the data field to include an archived flag
     // since there's no isArchived field in the schema
     const oldNotifications = await prisma.notification.findMany({
       where: {
         userId,
         createdAt: {
           lt: cutoffDate,
         },
         read: true, // Only archive read notifications
       },
     });
 
     // Update each notification to mark it as archived in the data field
     const updatePromises = oldNotifications.map(notification => {
       // Handle the case where data might be null or not an object
       const existingData = notification.data && typeof notification.data === 'object'
         ? notification.data
         : {};
       
       const updatedData = {
         ...existingData,
         archived: true,
         archivedAt: new Date(),
       };
 
       return prisma.notification.update({
         where: { id: notification.id },
         data: { data: updatedData },
       });
     });
 
     const results = await Promise.allSettled(updatePromises);
     const successfulUpdates = results.filter(result => result.status === 'fulfilled').length;
 
     return {
       count: successfulUpdates,
     };
   }
 
   async getArchivedNotifications(userId: string, limit: number = 50, offset: number = 0) {
     // Find notifications that have been marked as archived in the data field
     const notifications = await prisma.notification.findMany({
       where: {
         userId,
         data: {
           path: ['archived'],
           equals: true,
         },
       },
       orderBy: { createdAt: 'desc' },
       take: limit,
       skip: offset,
     });
 
     const total = await prisma.notification.count({
       where: {
         userId,
         data: {
           path: ['archived'],
           equals: true,
         },
       },
     });
 
     return {
       notifications,
       total,
     };
   }

  private async getUserPreferences(userId: string) {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  private shouldSendEmail(preferences: any, type: NotificationType): boolean {
    if (!preferences.emailEnabled) return false;

    const categoryMap: Record<string, keyof typeof preferences> = {
      POST_LIKED: 'emailPosts',
      POST_COMMENTED: 'emailPosts',
      POST_MENTIONED: 'emailPosts',
      NEW_MESSAGE: 'emailMessages',
      MESSAGE_REQUEST: 'emailMessages',
      EVENT_REMINDER: 'emailEvents',
      EVENT_UPDATED: 'emailEvents',
      COURSE_ENROLLED: 'emailCourses',
      LESSON_AVAILABLE: 'emailCourses',
    };

    const category = categoryMap[type];
    return category ? preferences[category] : true;
  }

  private shouldSendPush(preferences: any, type: NotificationType): boolean {
    if (!preferences.pushEnabled) return false;

    const categoryMap: Record<string, keyof typeof preferences> = {
      POST_LIKED: 'pushPosts',
      POST_COMMENTED: 'pushPosts',
      POST_MENTIONED: 'pushPosts',
      NEW_MESSAGE: 'pushMessages',
      MESSAGE_REQUEST: 'pushMessages',
      EVENT_REMINDER: 'pushEvents',
      EVENT_UPDATED: 'pushEvents',
      COURSE_ENROLLED: 'pushCourses',
      LESSON_AVAILABLE: 'pushCourses',
    };

    const category = categoryMap[type];
    return category ? preferences[category] : true;
  }

  private async queueEmail(notification: NotificationData) {
    const user = await prisma.user.findUnique({
      where: { id: notification.userId },
    });

    if (!user?.email) return;

    await emailService.queueEmail({
      to: user.email,
      subject: notification.title,
      template: 'notification',
      data: {
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        imageUrl: notification.imageUrl,
        ...notification.data,
      },
    });
  }

  private async sendPushNotification(notification: NotificationData) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: notification.userId },
    });

    for (const subscription of subscriptions) {
      await pushService.sendNotification(subscription, {
        title: notification.title,
        body: notification.message,
        icon: notification.imageUrl,
        badge: '/badge.png',
        data: {
          actionUrl: notification.actionUrl,
          ...notification.data,
        },
      });
    }
  }

  // Notification creation helpers
  async notifyPostLiked(postId: string, likerId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        community: true,
      },
    });

    if (!post || post.authorId === likerId) return;

    const liker = await prisma.user.findUnique({
      where: { id: likerId },
    });

    await this.create({
      userId: post.authorId,
      type: NotificationType.POST_LIKED,
      title: 'Your post was liked',
      message: `${liker?.username} liked your post in ${post.community.name}`,
      actionUrl: `/communities/${post.community.slug}/posts/${post.id}`,
      imageUrl: liker?.avatarUrl || undefined,
    });
  }

  async notifyNewComment(postId: string, commentId: string, commenterId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        community: true,
      },
    });

    if (!post || post.authorId === commenterId) return;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { author: true },
    });

    if (!comment) return;

    await this.create({
      userId: post.authorId,
      type: NotificationType.POST_COMMENTED,
      title: 'New comment on your post',
      message: `${comment.author.username} commented on your post in ${post.community.name}`,
      actionUrl: `/communities/${post.community.slug}/posts/${post.id}`,
      imageUrl: comment.author.avatarUrl || undefined,
    });
  }

  async notifyNewMessage(conversationId: string, senderId: string, message: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!conversation) return;

    const sender = conversation.participants.find((p: any) => p.userId === senderId);
    const recipients = conversation.participants.filter((p: any) => p.userId !== senderId);

    for (const recipient of recipients) {
      await this.create({
        userId: recipient.userId,
        type: NotificationType.NEW_MESSAGE,
        title: conversation.name
          ? `New message in ${conversation.name}`
          : `New message from ${sender?.user.username}`,
        message: message.substring(0, 100),
        actionUrl: `/messages?conversation=${conversationId}`,
        imageUrl: sender?.user.avatarUrl || undefined,
      });
    }
  }

  async notifyCourseEnrolled(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { community: true },
    });

    if (!course) return;

    await this.create({
      userId,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Course Enrollment Confirmed',
      message: `You've been enrolled in "${course.title}" in ${course.community.name}`,
      actionUrl: `/communities/${course.community.slug}/courses/${course.id}`,
    });
  }

  async notifyLessonAvailable(courseId: string, lessonId: string, userId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: { community: true }
            }
          }
        }
      },
    });

    if (!lesson) return;

    await this.create({
      userId,
      type: NotificationType.LESSON_AVAILABLE,
      title: 'New Lesson Available',
      message: `A new lesson "${lesson.title}" is now available in ${lesson.module.course.title}`,
      actionUrl: `/communities/${lesson.module.course.community.slug}/courses/${lesson.module.course.id}/learn`,
    });
  }

  async notifyAchievementUnlocked(userId: string, achievementName: string, points: number) {
    await this.create({
      userId,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: 'Achievement Unlocked!',
      message: `You unlocked "${achievementName}" and earned ${points} points!`,
      actionUrl: '/gamification/achievements',
      data: { achievementName, points },
    });
  }

  async notifyEventReminder(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { community: true },
    });

    if (!event) return;

    await this.create({
      userId,
      type: NotificationType.EVENT_REMINDER,
      title: 'Event Reminder',
      message: `"${event.title}" is starting soon in ${event.community.name}`,
      actionUrl: `/communities/${event.community.slug}/events/${event.id}`,
      data: { eventId },
    });
  }

  async notifyEventUpdated(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { community: true },
    });

    if (!event) return;

    await this.create({
      userId,
      type: NotificationType.EVENT_UPDATED,
      title: 'Event Updated',
      message: `The event "${event.title}" in ${event.community.name} has been updated`,
      actionUrl: `/communities/${event.community.slug}/events/${event.id}`,
      data: { eventId },
    });
  }

  async notifyEventCancelled(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { community: true },
    });

    if (!event) return;

    await this.create({
      userId,
      type: NotificationType.EVENT_CANCELLED,
      title: 'Event Cancelled',
      message: `The event "${event.title}" in ${event.community.name} has been cancelled`,
      actionUrl: `/communities/${event.community.slug}/events/${event.id}`,
      data: { eventId },
    });
  }

  async notifyLevelUp(userId: string, newLevel: number) {
    await this.create({
      userId,
      type: NotificationType.LEVEL_UP,
      title: 'Level Up!',
      message: `Congratulations! You've reached level ${newLevel}`,
      actionUrl: '/profile',
      data: { newLevel },
    });
  }

  async notifyPointsEarned(userId: string, points: number, reason: string) {
    await this.create({
      userId,
      type: NotificationType.POINTS_EARNED,
      title: 'Points Earned',
      message: `You earned ${points} points for ${reason}`,
      actionUrl: '/gamification/points',
      data: { points, reason },
    });
  }

  async notifyLeaderboardRank(userId: string, rank: number, period: string) {
    await this.create({
      userId,
      type: NotificationType.LEADERBOARD_RANK,
      title: 'Leaderboard Rank',
      message: `You're ranked #${rank} on the ${period} leaderboard!`,
      actionUrl: '/gamification/leaderboard',
      data: { rank, period },
    });
  }

  async notifySystemAnnouncement(userId: string, title: string, message: string) {
    await this.create({
      userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      actionUrl: '/announcements',
    });
  }

  async notifyAccountUpdate(userId: string, updateType: string) {
    await this.create({
      userId,
      type: NotificationType.ACCOUNT_UPDATE,
      title: 'Account Update',
      message: `Your account has been updated: ${updateType}`,
      actionUrl: '/settings',
      data: { updateType },
    });
  }

  async notifySecurityAlert(userId: string, alertType: string) {
    await this.create({
      userId,
      type: NotificationType.SECURITY_ALERT,
      title: 'Security Alert',
      message: `Security alert: ${alertType}`,
      actionUrl: '/settings/security',
      data: { alertType },
    });
  }

  async notifyCommunityInvite(userId: string, communityId: string, inviterId: string) {
    const [community, inviter] = await Promise.all([
      prisma.community.findUnique({ where: { id: communityId } }),
      prisma.user.findUnique({ where: { id: inviterId } }),
    ]);

    if (!community || !inviter) return;

    await this.create({
      userId,
      type: NotificationType.COMMUNITY_INVITE,
      title: 'Community Invite',
      message: `${inviter.username} invited you to join ${community.name}`,
      actionUrl: `/communities/${community.slug}`,
      data: { communityId, inviterId },
    });
  }

  async notifyCommunityJoinRequest(userId: string, communityId: string, requesterId: string) {
    const [community, requester] = await Promise.all([
      prisma.community.findUnique({ where: { id: communityId } }),
      prisma.user.findUnique({ where: { id: requesterId } }),
    ]);

    if (!community || !requester) return;

    await this.create({
      userId,
      type: NotificationType.COMMUNITY_JOIN_REQUEST,
      title: 'Join Request',
      message: `${requester.username} wants to join ${community.name}`,
      actionUrl: `/communities/${community.slug}/members`,
      data: { communityId, requesterId },
    });
  }

  async notifyMemberJoined(userId: string, communityId: string, newMemberId: string) {
    const [community, newMember] = await Promise.all([
      prisma.community.findUnique({ where: { id: communityId } }),
      prisma.user.findUnique({ where: { id: newMemberId } }),
    ]);

    if (!community || !newMember) return;

    await this.create({
      userId,
      type: NotificationType.MEMBER_JOINED,
      title: 'New Member',
      message: `${newMember.username} joined ${community.name}`,
      actionUrl: `/communities/${community.slug}/members`,
      data: { communityId, newMemberId },
    });
  }

  async notifyAssignmentGraded(userId: string, assignmentId: string, grade: number) {
    await this.create({
      userId,
      type: NotificationType.ASSIGNMENT_GRADED,
      title: 'Assignment Graded',
      message: `Your assignment has been graded with a score of ${grade}%`,
      actionUrl: `/assignments/${assignmentId}`,
      data: { assignmentId, grade },
    });
  }

  async notifyCertificateEarned(userId: string, certificateId: string, courseName: string) {
    await this.create({
      userId,
      type: NotificationType.CERTIFICATE_EARNED,
      title: 'Certificate Earned',
      message: `Congratulations! You've earned a certificate for ${courseName}`,
      actionUrl: `/certificates/${certificateId}`,
      data: { certificateId, courseName },
    });
  }

  async sendDigests(frequency: 'DAILY' | 'WEEKLY') {
    const usersToSend = await prisma.user.findMany({
      where: {
        notificationPreferences: {
          emailDigest: frequency,
          emailEnabled: true,
        },
      },
    });

    for (const user of usersToSend) {
      await emailService.sendDigest(user.id, frequency);
    }
  }
}

export const notificationService = new NotificationService();