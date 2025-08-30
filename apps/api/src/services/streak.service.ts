import { prisma } from '../lib/prisma';
import { StreakType } from '@prisma/client';
import { differenceInDays, startOfDay } from 'date-fns';
import { pointsService } from './points.service';

export class StreakService {
  async updateStreak(
    userId: string,
    type: StreakType
  ) {
    const streak = await prisma.streak.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });

    const today = startOfDay(new Date());

    if (!streak) {
      return prisma.streak.create({
        data: {
          userId,
          type,
          currentDays: 1,
          bestDays: 1,
          lastActivity: today,
        },
      });
    }

    const lastActivity = streak.lastActivity ? startOfDay(streak.lastActivity) : null;

    if (!lastActivity) {
      return this.resetStreak(streak.id, today);
    }

    const daysSinceLastActivity = differenceInDays(today, lastActivity);

    if (daysSinceLastActivity === 0) {
      return streak; // Already updated today
    } else if (daysSinceLastActivity === 1) {
      // Continue streak
      const newCurrentDays = streak.currentDays + 1;
      const newBestDays = Math.max(newCurrentDays, streak.bestDays);

      if (newCurrentDays % 7 === 0) {
        await pointsService.awardPoints(
          userId,
          'STREAK_BONUS',
          `${newCurrentDays} day ${type} streak!`,
          undefined,
          newCurrentDays * 2
        );
      }

      return prisma.streak.update({
        where: { id: streak.id },
        data: {
          currentDays: newCurrentDays,
          bestDays: newBestDays,
          lastActivity: today,
        },
      });
    } else {
      // Streak broken
      return this.resetStreak(streak.id, today);
    }
  }

  private async resetStreak(streakId: string, date: Date) {
    return prisma.streak.update({
      where: { id: streakId },
      data: {
        currentDays: 1,
        lastActivity: date,
        endDate: date,
      },
    });
  }

  async getUserStreaks(userId: string) {
    return prisma.streak.findMany({
      where: { userId },
    });
  }

  async checkDailyLogin(userId: string) {
    await this.updateStreak(userId, StreakType.DAILY_LOGIN);

    await pointsService.awardPoints(
      userId,
      'DAILY_LOGIN',
      'Daily login bonus'
    );
  }

  async getStreakStats(userId: string) {
    const streaks = await this.getUserStreaks(userId);

    return {
      dailyLogin: streaks.find(s => s.type === StreakType.DAILY_LOGIN),
      dailyPost: streaks.find(s => s.type === StreakType.DAILY_POST),
      courseProgress: streaks.find(s => s.type === StreakType.COURSE_PROGRESS),
      contribution: streaks.find(s => s.type === StreakType.CONTRIBUTION),
    };
  }
}

export const streakService = new StreakService();