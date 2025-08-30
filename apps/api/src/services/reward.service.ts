import { prisma } from '../lib/prisma';
import { pointsService } from './points.service';

export class RewardService {
  async getAvailableRewards() {
    return prisma.reward.findMany({
      where: { isActive: true },
    });
  }

  async claimReward(userId: string, rewardId: string) {
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) {
      throw new Error('Reward not available.');
    }

    const userPoints = await pointsService.getUserPoints(userId);
    if (userPoints < reward.cost) {
      throw new Error('Insufficient points.');
    }

    if (reward.stock !== null && reward.stock <= 0) {
      throw new Error('Reward out of stock.');
    }

    return prisma.$transaction(async (tx) => {
      await pointsService.deductPoints(userId, reward.cost, `Claimed reward: ${reward.name}`);

      const userReward = await tx.userReward.create({
        data: { userId, rewardId },
      });

      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });
      }

      // Here you would add logic to grant the actual reward,
      // e.g., grant course access, generate a discount code, etc.

      return userReward;
    });
  }
}

export const rewardService = new RewardService();