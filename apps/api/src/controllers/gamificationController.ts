import { Response } from 'express';
import { BaseController } from './baseController';
import { AuthRequest } from '../middleware/auth';
import { pointsService } from '../services/points.service';
import { achievementService } from '../services/achievement.service';
import { leaderboardService } from '../services/leaderboard.service';
import { streakService } from '../services/streak.service';
import { rewardService } from '../services/reward.service';
import { prisma } from '../lib/prisma';
import { LeaderboardPeriod } from '@prisma/client';

class GamificationController extends BaseController {
  // --- User Stats ---
  async getMyStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;

      // Get user level and points
      const [userLevel, totalPoints] = await Promise.all([
        prisma.userLevel.findUnique({ where: { userId } }),
        pointsService.getUserPoints(userId)
      ]);

      // Get streak info
      const streaks = await streakService.getUserStreaks(userId);
      const dailyLoginStreak = streaks.find(s => s.type === 'DAILY_LOGIN');

      // Get achievement count
      const achievements = await achievementService.getUserAchievements(userId);
      const unlockedAchievements = achievements.filter(a => a.unlockedAt).length;

      const stats = {
        points: totalPoints,
        level: userLevel?.level || 1,
        experience: userLevel?.experience || 0,
        nextLevelXp: userLevel?.nextLevelXp || 100,
        levelTitle: userLevel?.title || 'Novice',
        currentStreak: dailyLoginStreak?.currentDays || 0,
        bestStreak: dailyLoginStreak?.bestDays || 0,
        achievements: unlockedAchievements,
        totalAchievements: achievements.length
      };

      this.sendSuccess(res, stats);
    } catch (error) {
      this.sendError(res, 'Failed to fetch user stats', 500);
    }
  }

  async getUserStats(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      // Get user level and points
      const [userLevel, totalPoints] = await Promise.all([
        prisma.userLevel.findUnique({ where: { userId } }),
        pointsService.getUserPoints(userId)
      ]);

      // Get streak info
      const streaks = await streakService.getUserStreaks(userId);
      const dailyLoginStreak = streaks.find(s => s.type === 'DAILY_LOGIN');

      // Get achievement count
      const achievements = await achievementService.getUserAchievements(userId);
      const unlockedAchievements = achievements.filter(a => a.unlockedAt).length;

      const stats = {
        userId,
        points: totalPoints,
        level: userLevel?.level || 1,
        experience: userLevel?.experience || 0,
        nextLevelXp: userLevel?.nextLevelXp || 100,
        levelTitle: userLevel?.title || 'Novice',
        currentStreak: dailyLoginStreak?.currentDays || 0,
        bestStreak: dailyLoginStreak?.bestDays || 0,
        achievements: unlockedAchievements,
        totalAchievements: achievements.length
      };

      this.sendSuccess(res, stats);
    } catch (error) {
      this.sendError(res, 'Failed to fetch user stats', 500);
    }
  }

  // --- Points ---
  async getMyPoints(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const points = await pointsService.getUserPoints(userId);
      this.sendSuccess(res, { points });
    } catch (error) {
      this.sendError(res, 'Failed to fetch points', 500);
    }
  }

  async getMyPointsHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const history = await pointsService.getPointsHistory(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      this.sendSuccess(res, history);
    } catch (error) {
      this.sendError(res, 'Failed to fetch points history', 500);
    }
  }

  // --- Achievements ---
  async getMyAchievements(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const achievements = await achievementService.getUserAchievements(userId);
      this.sendSuccess(res, achievements);
    } catch (error) {
      this.sendError(res, 'Failed to fetch achievements', 500);
    }
  }

  async getUserAchievements(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const achievements = await achievementService.getUserAchievements(userId);
      this.sendSuccess(res, achievements);
    } catch (error) {
      this.sendError(res, 'Failed to fetch user achievements', 500);
    }
  }

  // --- Leaderboard ---
  async getLeaderboard(req: AuthRequest, res: Response) {
    try {
      const { period = 'ALL_TIME', communityId } = req.query;

      const leaderboard = await leaderboardService.getLeaderboard(
        period as LeaderboardPeriod,
        communityId as string
      );

      this.sendSuccess(res, leaderboard);
    } catch (error) {
      this.sendError(res, 'Failed to fetch leaderboard', 500);
    }
  }

  async getMyRank(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { period = 'ALL_TIME', communityId } = req.query;

      const rank = await leaderboardService.getUserRank(
        userId,
        period as LeaderboardPeriod,
        communityId as string
      );

      this.sendSuccess(res, rank);
    } catch (error) {
      this.sendError(res, 'Failed to fetch user rank', 500);
    }
  }

  // --- Streaks ---
  async getMyStreaks(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id;
      const streaks = await streakService.getUserStreaks(userId);
      this.sendSuccess(res, streaks);
    } catch (error) {
      this.sendError(res, 'Failed to fetch streaks', 500);
    }
  }

  // --- Rewards ---
  async getRewards(req: AuthRequest, res: Response) {
    try {
      const rewards = await rewardService.getAvailableRewards();
      this.sendSuccess(res, rewards);
    } catch (error) {
      this.sendError(res, 'Failed to fetch rewards', 500);
    }
  }

  async claimReward(req: AuthRequest, res: Response) {
    try {
      const { rewardId } = req.params;
      const userId = req.user.id;

      const userReward = await rewardService.claimReward(userId, rewardId);
      this.sendSuccess(res, userReward);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Reward not available.') {
          return this.sendError(res, error.message, 404);
        }
        if (error.message === 'Insufficient points.') {
          return this.sendError(res, error.message, 400);
        }
        if (error.message === 'Reward out of stock.') {
          return this.sendError(res, error.message, 400);
        }
      }
      this.sendError(res, 'Failed to claim reward', 500);
    }
  }
}

export const gamificationController = new GamificationController();