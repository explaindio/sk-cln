import { prisma } from '../lib/prisma';
import { ChallengeType, PointType } from '@prisma/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { pointsService } from './points.service';

export class ChallengeService {
  // This would be run by a cron job daily/weekly
  async generateChallenges() {
    // Example: Generate a daily "post once" challenge
    const today = new Date();
    await prisma.challenge.create({
      data: {
        name: 'Daily Post',
        description: 'Create one post today',
        type: ChallengeType.DAILY,
        criteria: { action: 'POST_CREATED', count: 1 },
        points: 15,
        isActive: true,
        startDate: startOfDay(today),
        endDate: endOfDay(today),
      },
    });
  }

  async updateChallengeProgress(userId: string, actionType: PointType) {
    const now = new Date();
    const activeChallenges = await prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    for (const challenge of activeChallenges) {
      const criteria = challenge.criteria as { action: string; count: number };
      if (criteria.action === actionType) {
        const userChallenge = await prisma.userChallenge.upsert({
          where: { userId_challengeId: { userId, challengeId: challenge.id } },
          create: { userId, challengeId: challenge.id, progress: 1 },
          update: { progress: { increment: 1 } },
        });

        if (userChallenge.progress >= criteria.count && !userChallenge.completedAt) {
          await this.completeChallenge(userId, challenge.id);
        }
      }
    }
  }

  async completeChallenge(userId: string, challengeId: string) {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return;

    await prisma.userChallenge.update({
      where: { userId_challengeId: { userId, challengeId } },
      data: { completedAt: new Date() },
    });

    await pointsService.awardPoints(
      userId,
      PointType.CHALLENGE_COMPLETED,
      `Completed challenge: ${challenge.name}`,
      undefined,
      challenge.points
    );
  }

  async getUserChallenges(userId: string) {
    const now = new Date();
    return prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        userChallenges: {
          where: { userId },
        },
      },
    });
  }

  // Additional utility methods
  async createChallenge(data: {
    name: string;
    description: string;
    type: ChallengeType;
    criteria: any;
    points: number;
    startDate: Date;
    endDate: Date;
    badge?: string;
  }) {
    return prisma.challenge.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async getActiveChallenges() {
    const now = new Date();
    return prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  async deactivateChallenge(challengeId: string) {
    return prisma.challenge.update({
      where: { id: challengeId },
      data: { isActive: false },
    });
  }

  async generateWeeklyChallenge() {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    await prisma.challenge.create({
      data: {
        name: 'Weekly Contributor',
        description: 'Create 5 posts this week',
        type: ChallengeType.WEEKLY,
        criteria: { action: 'POST_CREATED', count: 5 },
        points: 50,
        isActive: true,
        startDate: weekStart,
        endDate: weekEnd,
      },
    });
  }
}

export const challengeService = new ChallengeService();