import { prisma } from '../lib/prisma';
import { PointType } from '@prisma/client';
import { notificationService } from './notification.service';
import { socketService } from './socket.service';

interface AchievementCriteria {
  type: string;
  target: number;
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export class AchievementService {
  async initializeAchievements() {
    const achievements = [
      {
        name: 'first_post',
        description: 'Create your first post',
        icon: '✍️',
        category: 'posting',
        points: 10,
        criteria: { type: 'posts_created', target: 1 },
      },
      {
        name: 'prolific_poster',
        description: 'Create 100 posts',
        icon: '📝',
        category: 'posting',
        points: 100,
        criteria: { type: 'posts_created', target: 100 },
      },
      {
        name: 'helpful_member',
        description: 'Receive 50 likes on your posts',
        icon: '👍',
        category: 'engagement',
        points: 50,
        criteria: { type: 'likes_received', target: 50 },
      },
      {
        name: 'course_completer',
        description: 'Complete your first course',
        icon: '🎓',
        category: 'learning',
        points: 100,
        criteria: { type: 'courses_completed', target: 1 },
      },
      {
        name: 'streak_starter',
        description: 'Maintain a 7-day login streak',
        icon: '🔥',
        category: 'streak',
        points: 30,
        criteria: { type: 'login_streak', target: 7 },
      },
      {
        name: 'event_enthusiast',
        description: 'Attend 5 events',
        icon: '📅',
        category: 'events',
        points: 50,
        criteria: { type: 'events_attended', target: 5 },
      },
      {
        name: 'social_butterfly',
        description: 'Send 100 messages',
        icon: '💬',
        category: 'social',
        points: 40,
        criteria: { type: 'messages_sent', target: 100 },
      },
      {
        name: 'knowledge_seeker',
        description: 'Complete 10 lessons',
        icon: '📚',
        category: 'learning',
        points: 50,
        criteria: { type: 'lessons_completed', target: 10 },
      },
    ];

    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: achievement,
        create: achievement,
      });
    }
  }

  async checkAchievements(
    userId: string,
    actionType: PointType,
    metadata?: any
  ) {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
    });

    for (const achievement of achievements) {
      const criteria = achievement.criteria as unknown as AchievementCriteria;

      if (!this.isRelevantAction(actionType, criteria.type)) {
        continue;
      }

      const progress = await this.getUserProgress(userId, criteria);

      const userAchievement = await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
        create: {
          userId,
          achievementId: achievement.id,
          progress,
        },
        update: {
          progress,
        },
      });

      if (progress >= criteria.target && !userAchievement.unlockedAt) {
        await this.unlockAchievement(userId, achievement.id);
      }
    }
  }

  private async unlockAchievement(userId: string, achievementId: string) {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) return;

    await prisma.userAchievement.update({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      data: {
        unlockedAt: new Date(),
        progress: (achievement.criteria as unknown as AchievementCriteria).target,
      },
    });

    // Create notification for achievement unlock
    await notificationService.create({
      userId,
      type: 'ACHIEVEMENT_UNLOCKED',
      title: 'Achievement Unlocked!',
      message: `You've unlocked the "${achievement.name}" achievement!`,
      data: {
        achievementId,
        icon: achievement.icon,
        points: achievement.points,
      },
    });

    // Send real-time notification via WebSocket
    socketService.sendNotification(userId, {
      type: 'ACHIEVEMENT_UNLOCKED',
      title: 'Achievement Unlocked!',
      message: `You've unlocked the "${achievement.name}" achievement!`,
      data: {
        achievementId,
        icon: achievement.icon,
        points: achievement.points,
      },
    });

    // Note: PointsService will call this service, so we don't call it back to avoid circular dependency.
    // The points for unlocking are handled separately.
  }

  private async getUserProgress(
    userId: string,
    criteria: AchievementCriteria
  ): Promise<number> {
    switch (criteria.type) {
      case 'posts_created':
        return prisma.post.count({ where: { authorId: userId } });
      case 'likes_received':
        return prisma.reaction.count({ where: { post: { authorId: userId } } });
      case 'courses_completed':
        return prisma.userProgress.count({ where: { userId, status: 'completed' } });
      case 'login_streak':
        const streak = await prisma.streak.findUnique({
          where: { userId_type: { userId, type: 'DAILY_LOGIN' } },
        });
        return streak?.currentDays || 0;
      default:
        return 0;
    }
  }

  private isRelevantAction(action: PointType, criteriaType: string): boolean {
    const mapping: Record<string, PointType[]> = {
      posts_created: [PointType.POST_CREATED],
      likes_received: [PointType.POST_LIKED],
      courses_completed: [PointType.COURSE_COMPLETED],
      lessons_completed: [PointType.LESSON_COMPLETED],
      events_attended: [PointType.EVENT_ATTENDED],
      login_streak: [PointType.DAILY_LOGIN],
    };

    return mapping[criteriaType]?.includes(action) || false;
  }

  async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getAchievementProgress(userId: string) {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
    });

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
    });

    const achievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    return achievements.map(achievement => ({
      ...achievement,
      userProgress: achievementMap.get(achievement.id) || {
        progress: 0,
        unlockedAt: null,
      },
    }));
  }
}

export const achievementService = new AchievementService();