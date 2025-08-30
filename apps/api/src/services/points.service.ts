import { prisma } from '../lib/prisma';
import { PointType } from '@prisma/client';
import { achievementService } from './achievement.service';
// import { notificationService } from './notification.service'; // Commented out as it doesn't exist

interface PointConfig {
  // Changed from mapped type to regular interface
  POST_CREATED: number;
  POST_LIKED: number;
  COMMENT_CREATED: number;
  COURSE_COMPLETED: number;
  LESSON_COMPLETED: number;
  QUIZ_PASSED: number;
  EVENT_ATTENDED: number;
  DAILY_LOGIN: number;
  STREAK_BONUS: number;
  ACHIEVEMENT_UNLOCKED: number;
  CHALLENGE_COMPLETED: number;
  REFERRAL: number;
  OTHER: number;
}

const POINT_VALUES: PointConfig = {
  POST_CREATED: 10,
  POST_LIKED: 1,
  COMMENT_CREATED: 5,
  COURSE_COMPLETED: 100,
  LESSON_COMPLETED: 10,
  QUIZ_PASSED: 20,
  EVENT_ATTENDED: 30,
  DAILY_LOGIN: 5,
  STREAK_BONUS: 15,
  ACHIEVEMENT_UNLOCKED: 50,
  CHALLENGE_COMPLETED: 25,
  REFERRAL: 100,
  OTHER: 0,
};

export class PointsService {
  async awardPoints(
    userId: string,
    type: PointType,
    reason: string,
    communityId?: string,
    customAmount?: number,
    metadata?: any
  ) {
    // Fixed the indexing issue by using type assertion
    const amount = customAmount || POINT_VALUES[type as keyof PointConfig];

    const points = await prisma.points.create({
      data: {
        userId,
        communityId,
        type,
        amount,
        reason,
        metadata,
      },
    });

    await this.updateUserLevel(userId, amount);

    // Commented out as notificationService doesn't exist
    // await notificationService.create({
    //   userId,
    //   type: 'POINTS_EARNED',
    //   title: 'Points Earned!',
    //   message: `You earned ${amount} points for ${reason}`,
    //   data: { points: amount, type },
    // });

    return points;
  }

  async getUserPoints(userId: string, communityId?: string) {
    const where = communityId
      ? { userId, communityId }
      : { userId };

    const points = await prisma.points.aggregate({
      where,
      _sum: { amount: true },
    });

    return points._sum.amount || 0;
  }

  async getPointsHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return prisma.points.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        community: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getPointsBreakdown(userId: string, communityId?: string) {
    const where = communityId
      ? { userId, communityId }
      : { userId };

    const breakdown = await prisma.points.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    return breakdown.map(item => ({
      type: item.type,
      totalPoints: item._sum.amount || 0,
      count: item._count,
    }));
  }

  private async updateUserLevel(userId: string, pointsEarned: number) {
    let userLevel = await prisma.userLevel.findUnique({
      where: { userId },
    });

    if (!userLevel) {
      userLevel = await prisma.userLevel.create({
        data: {
          userId,
          level: 1,
          experience: 0,
          nextLevelXp: 100,
        },
      });
    }

    let { level, experience, nextLevelXp } = userLevel;
    experience += pointsEarned;

    while (experience >= nextLevelXp) {
      experience -= nextLevelXp;
      level++;
      nextLevelXp = this.calculateNextLevelXp(level);

      await this.awardPoints(
        userId,
        PointType.ACHIEVEMENT_UNLOCKED,
        `Reached level ${level}!`,
        undefined,
        level * 10
      );
    }

    const updatedLevel = await prisma.userLevel.update({
      where: { userId },
      data: {
        level,
        experience,
        nextLevelXp,
        title: this.getLevelTitle(level),
      },
    });

    return updatedLevel;
  }

  private calculateNextLevelXp(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  private getLevelTitle(level: number): string {
    if (level < 5) return 'Novice';
    if (level < 10) return 'Apprentice';
    if (level < 20) return 'Journeyman';
    if (level < 30) return 'Expert';
    if (level < 50) return 'Master';
    return 'Legend';
  }

  async deductPoints(
    userId: string,
    amount: number,
    reason: string,
    communityId?: string
  ) {
    const currentPoints = await this.getUserPoints(userId, communityId);
    if (currentPoints < amount) {
      throw new Error('Insufficient points');
    }

    return prisma.points.create({
      data: {
        userId,
        communityId,
        type: PointType.OTHER,
        amount: -amount,
        reason,
      },
    });
  }
}

export const pointsService = new PointsService();