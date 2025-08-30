import { prisma } from '../lib/prisma';
import { LeaderboardPeriod } from '@prisma/client';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  points: number;
  level?: number;
  change?: number; // Position change from previous period
}

export class LeaderboardService {
  async getLeaderboard(
    period: LeaderboardPeriod,
    communityId?: string,
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const cached = await prisma.leaderboard.findFirst({
      where: {
        communityId,
        period,
        startDate,
        endDate,
      },
    });

    if (cached && this.isCacheValid(cached)) {
      return cached.snapshot as unknown as LeaderboardEntry[];
    }

    const leaderboard = await this.generateLeaderboard(
      period,
      communityId,
      startDate,
      endDate,
      limit
    );

    await prisma.leaderboard.upsert({
      where: { id: cached?.id || '' },
      create: {
        communityId,
        period,
        startDate,
        endDate,
        snapshot: leaderboard as any,
      },
      update: {
        snapshot: leaderboard as any,
      }
    });

    return leaderboard;
  }

  private async generateLeaderboard(
    period: LeaderboardPeriod,
    communityId: string | undefined,
    startDate: Date,
    endDate: Date,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    const where = {
      communityId,
      ...(period !== LeaderboardPeriod.ALL_TIME && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    };

    const userPoints = await prisma.points.groupBy({
      by: ['userId'],
      where,
      _sum: { amount: true },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    const userIds = userPoints.map(up => up.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        userLevels: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const previousRankings = await this.getPreviousPeriodRankings(
      period,
      communityId,
      startDate
    );

    const leaderboard: LeaderboardEntry[] = userPoints.map((up, index) => {
      const user = userMap.get(up.userId)!;

      const previousRank = previousRankings.get(up.userId);

      return {
        rank: index + 1,
        userId: up.userId,
        username: user.username,
        avatar: user.avatarUrl || undefined,
        points: up._sum.amount || 0,
        level: user.userLevels?.level,
        change: previousRank ? previousRank - (index + 1) : undefined,
      };
    });

    return leaderboard;
  }

  private getPeriodDates(period: LeaderboardPeriod) {
    const now = new Date();

    switch (period) {
      case LeaderboardPeriod.DAILY:
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case LeaderboardPeriod.WEEKLY:
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case LeaderboardPeriod.MONTHLY:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case LeaderboardPeriod.ALL_TIME:
        return { startDate: new Date(0), endDate: now };
    }
  }

  private async getPreviousPeriodRankings(
    period: LeaderboardPeriod,
    communityId: string | undefined,
    currentStartDate: Date
  ): Promise<Map<string, number>> {
    const previousLeaderboard = await prisma.leaderboard.findFirst({
      where: {
        communityId,
        period,
        endDate: { lt: currentStartDate },
      },
      orderBy: { endDate: 'desc' },
    });

    if (!previousLeaderboard) {
      return new Map();
    }

    const entries = previousLeaderboard.snapshot as unknown as LeaderboardEntry[];
    return new Map(entries.map(e => [e.userId, e.rank]));
  }

  private isCacheValid(cached: any): boolean {
    const cacheAge = Date.now() - new Date(cached.createdAt).getTime();
    return cacheAge < 60 * 60 * 1000; // 1 hour
  }

  async getUserRank(
    userId: string,
    period: LeaderboardPeriod,
    communityId?: string
  ) {
    const leaderboard = await this.getLeaderboard(period, communityId);
    const entry = leaderboard.find(e => e.userId === userId);

    if (entry) {
      return entry;
    }

    const { startDate, endDate } = this.getPeriodDates(period);
    const where = {
      communityId,
      ...(period !== LeaderboardPeriod.ALL_TIME && {
        createdAt: { gte: startDate, lte: endDate },
      }),
    };

    const userPoints = await prisma.points.aggregate({
      where: { ...where, userId },
      _sum: { amount: true },
    });

    const totalPoints = userPoints._sum.amount || 0;

    const usersAbove = await prisma.points.groupBy({
      by: ['userId'],
      where,
      _sum: { amount: true },
      having: { amount: { _sum: { gt: totalPoints } } },
    });

    return {
      rank: usersAbove.length + 1,
      userId,
      points: totalPoints,
    };
  }
}

export const leaderboardService = new LeaderboardService();