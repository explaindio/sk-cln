import { challengeService } from '../services/challenge.service';
import { prisma } from '../lib/prisma';
import { ChallengeType, PointType } from '@prisma/client';

// Mock the prisma client
jest.mock('../lib/prisma', () => ({
  prisma: {
    challenge: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userChallenge: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock the points service
jest.mock('../services/points.service', () => ({
  pointsService: {
    awardPoints: jest.fn(),
  },
}));

describe('ChallengeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateChallenges', () => {
    it('should create a daily challenge', async () => {
      const mockChallenge = {
        id: '1',
        name: 'Daily Post',
        description: 'Create one post today',
        type: ChallengeType.DAILY,
        criteria: { action: 'POST_CREATED', count: 1 },
        points: 15,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
      };

      (prisma.challenge.create as jest.Mock).mockResolvedValue(mockChallenge);

      await challengeService.generateChallenges();

      expect(prisma.challenge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Daily Post',
          description: 'Create one post today',
          type: ChallengeType.DAILY,
          criteria: { action: 'POST_CREATED', count: 1 },
          points: 15,
          isActive: true,
        }),
      });
    });
  });

  describe('updateChallengeProgress', () => {
    it('should update user challenge progress', async () => {
      const userId = 'user1';
      const challengeId = 'challenge1';
      const mockChallenge = {
        id: challengeId,
        criteria: { action: 'POST_CREATED', count: 1 },
        points: 15,
      };

      const mockUserChallenge = {
        userId,
        challengeId,
        progress: 1,
        completedAt: null,
      };

      (prisma.challenge.findMany as jest.Mock).mockResolvedValue([mockChallenge]);
      (prisma.userChallenge.upsert as jest.Mock).mockResolvedValue(mockUserChallenge);

      await challengeService.updateChallengeProgress(userId, PointType.POST_CREATED);

      expect(prisma.userChallenge.upsert).toHaveBeenCalledWith({
        where: { userId_challengeId: { userId, challengeId } },
        create: { userId, challengeId, progress: 1 },
        update: { progress: { increment: 1 } },
      });
    });
  });

  describe('completeChallenge', () => {
    it('should complete a challenge and award points', async () => {
      const userId = 'user1';
      const challengeId = 'challenge1';
      const mockChallenge = {
        id: challengeId,
        name: 'Daily Post',
        points: 15,
      };

      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);
      (prisma.userChallenge.update as jest.Mock).mockResolvedValue({});

      await challengeService.completeChallenge(userId, challengeId);

      expect(prisma.userChallenge.update).toHaveBeenCalledWith({
        where: { userId_challengeId: { userId, challengeId } },
        data: { completedAt: expect.any(Date) },
      });
    });
  });

  describe('getUserChallenges', () => {
    it('should return active challenges with user progress', async () => {
      const userId = 'user1';
      const mockChallenges = [
        {
          id: '1',
          name: 'Daily Post',
          userChallenges: [
            {
              userId,
              challengeId: '1',
              progress: 1,
              completedAt: null,
            },
          ],
        },
      ];

      (prisma.challenge.findMany as jest.Mock).mockResolvedValue(mockChallenges);

      const result = await challengeService.getUserChallenges(userId);

      expect(result).toEqual(mockChallenges);
      expect(prisma.challenge.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
        }),
        include: {
          userChallenges: {
            where: { userId },
          },
        },
      });
    });
  });

  describe('createChallenge', () => {
    it('should create a new challenge', async () => {
      const challengeData = {
        name: 'Test Challenge',
        description: 'Test description',
        type: ChallengeType.DAILY,
        criteria: { action: 'POST_CREATED', count: 3 },
        points: 20,
        startDate: new Date(),
        endDate: new Date(),
      };

      const mockChallenge = { id: '1', ...challengeData, isActive: true };

      (prisma.challenge.create as jest.Mock).mockResolvedValue(mockChallenge);

      const result = await challengeService.createChallenge(challengeData);

      expect(result).toEqual(mockChallenge);
      expect(prisma.challenge.create).toHaveBeenCalledWith({
        data: {
          ...challengeData,
          isActive: true,
        },
      });
    });
  });
});