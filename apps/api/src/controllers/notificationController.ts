import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { pushService } from '../services/push.service';
import { prisma } from '../lib/prisma';

export const getNotifications = async (req: Request, res: Response) => {
  const { unreadOnly } = req.query;
  const data = await notificationService.getNotifications(req.user.id, 50, 0, unreadOnly === 'true');
  res.json(data);
};

export const markAsRead = async (req: Request, res: Response) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  res.status(204).send();
};

export const markAllAsRead = async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user.id);
  res.status(204).send();
};

export const getPreferences = async (req: Request, res: Response) => {
  try {
    const preferences = await notificationService['getUserPreferences'](req.user.id);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const {
      emailEnabled,
      emailDigest,
      emailPosts,
      emailComments,
      emailMessages,
      emailEvents,
      emailCourses,
      pushEnabled,
      pushPosts,
      pushComments,
      pushMessages,
      pushEvents,
      pushCourses,
      inAppEnabled,
      inAppSound,
      notificationSound,
      dndEnabled,
      dndStart,
      dndEnd
    } = req.body;

    // Validate the request body
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No preferences provided to update' });
    }

    // Build the update data object with only provided values
    const updateData: any = {};
    if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
    if (emailDigest !== undefined) updateData.emailDigest = emailDigest;
    if (emailPosts !== undefined) updateData.emailPosts = emailPosts;
    if (emailComments !== undefined) updateData.emailComments = emailComments;
    if (emailMessages !== undefined) updateData.emailMessages = emailMessages;
    if (emailEvents !== undefined) updateData.emailEvents = emailEvents;
    if (emailCourses !== undefined) updateData.emailCourses = emailCourses;
    if (pushEnabled !== undefined) updateData.pushEnabled = pushEnabled;
    if (pushPosts !== undefined) updateData.pushPosts = pushPosts;
    if (pushComments !== undefined) updateData.pushComments = pushComments;
    if (pushMessages !== undefined) updateData.pushMessages = pushMessages;
    if (pushEvents !== undefined) updateData.pushEvents = pushEvents;
    if (pushCourses !== undefined) updateData.pushCourses = pushCourses;
    if (inAppEnabled !== undefined) updateData.inAppEnabled = inAppEnabled;
    if (inAppSound !== undefined) updateData.inAppSound = inAppSound;
    if (notificationSound !== undefined) updateData.notificationSound = notificationSound;
    if (dndEnabled !== undefined) updateData.dndEnabled = dndEnabled;
    if (dndStart !== undefined) updateData.dndStart = dndStart;
    if (dndEnd !== undefined) updateData.dndEnd = dndEnd;

    // Update the preferences
    const preferences = await prisma.notificationPreference.update({
      where: { userId: req.user.id },
      data: updateData,
    });
    
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

export const subscribePush = async (req: Request, res: Response) => {
  await pushService.subscribe(req.user.id, req.body.subscription);
  res.status(201).send();
};

export const unsubscribePush = async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    await pushService.unsubscribe(endpoint);
    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
};
export const sendTestNotification = async (req: Request, res: Response) => {
  const { type } = req.body;
  try {
    // Create a sample notification of the given type for the current user
    switch (type) {
      case 'POST_LIKED':
        await notificationService.notifyPostLiked('test-post-id', req.user.id);
        break;
      case 'NEW_MESSAGE':
        await notificationService.notifyNewMessage('test-conversation-id', req.user.id, 'This is a test message');
        break;
      case 'ACHIEVEMENT_UNLOCKED':
        await notificationService.notifyAchievementUnlocked(req.user.id, 'Test Achievement', 100);
        break;
      default:
        // Create a generic notification
        await notificationService.create({
          userId: req.user.id,
          type: type as any,
          title: 'Test Notification',
          message: `This is a test notification of type ${type}`,
        });
    }
    res.status(200).json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};

export const getNotificationHistory = async (req: Request, res: Response) => {
  try {
    const { limit, offset, startDate, endDate } = req.query;
    
    const history = await notificationService.getNotificationHistory(
      req.user.id,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};

export const archiveOldNotifications = async (req: Request, res: Response) => {
  try {
    const { daysOld } = req.body;
    
    const result = await notificationService.archiveOldNotifications(
      req.user.id,
      daysOld ? parseInt(daysOld) : undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error archiving notifications:', error);
    res.status(500).json({ error: 'Failed to archive notifications' });
  }
};

export const getArchivedNotifications = async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    
    const archived = await notificationService.getArchivedNotifications(
      req.user.id,
      limit ? parseInt(limit as string) : undefined,
      offset ? parseInt(offset as string) : undefined
    );
    
    res.json(archived);
  } catch (error) {
    console.error('Error fetching archived notifications:', error);
    res.status(500).json({ error: 'Failed to fetch archived notifications' });
  }
};