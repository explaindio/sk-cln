import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';

// Define available reaction types
export const REACTION_TYPES = {
  LIKE: 'like',
  LOVE: 'love',
  LAUGH: 'laugh',
  ANGRY: 'angry',
  SAD: 'sad',
  CELEBRATE: 'celebrate',
  SUPPORT: 'support',
  INSIGHTFUL: 'insightful'
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];

export class ReactionService {
  async addOrChangePostReaction(postId: string, userId: string, type: ReactionType) {
    const existing = await prisma.reaction.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existing) {
      if (existing.type === type) {
        // Remove reaction if same type
        await prisma.reaction.delete({
          where: { id: existing.id },
        });
        
        // Decrement the appropriate counter
        await this.updatePostReactionCount(postId, existing.type, 'decrement');

        return { action: 'removed', previousType: existing.type };
      } else {
        // Change reaction type
        await prisma.reaction.update({
          where: { id: existing.id },
          data: { type, updatedAt: new Date() },
        });

        // Update counters
        await this.updatePostReactionCount(postId, existing.type, 'decrement');
        await this.updatePostReactionCount(postId, type, 'increment');

        // Send notification for new reaction type
        await this.sendReactionNotification('post', postId, userId, type);

        return { action: 'changed', previousType: existing.type, newType: type };
      }
    } else {
      // Add new reaction
      await prisma.reaction.create({
        data: {
          userId,
          postId,
          type,
        },
      });

      // Increment the appropriate counter
      await this.updatePostReactionCount(postId, type, 'increment');

      // Send notification
      await this.sendReactionNotification('post', postId, userId, type);

      return { action: 'added', newType: type };
    }
  }

  async addOrChangeCommentReaction(commentId: string, userId: string, type: ReactionType) {
    const existing = await prisma.reaction.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existing) {
      if (existing.type === type) {
        // Remove reaction if same type
        await prisma.reaction.delete({
          where: { id: existing.id },
        });
        
        // Decrement the appropriate counter
        await this.updateCommentReactionCount(commentId, existing.type, 'decrement');

        return { action: 'removed', previousType: existing.type };
      } else {
        // Change reaction type
        await prisma.reaction.update({
          where: { id: existing.id },
          data: { type, updatedAt: new Date() },
        });

        // Update counters
        await this.updateCommentReactionCount(commentId, existing.type, 'decrement');
        await this.updateCommentReactionCount(commentId, type, 'increment');

        return { action: 'changed', previousType: existing.type, newType: type };
      }
    } else {
      // Add new reaction
      await prisma.reaction.create({
        data: {
          userId,
          commentId,
          type,
        },
      });

      // Increment the appropriate counter
      await this.updateCommentReactionCount(commentId, type, 'increment');

      return { action: 'added', newType: type };
    }
  }

  private async updatePostReactionCount(postId: string, type: ReactionType, operation: 'increment' | 'decrement') {
    const updateData: any = {};
    
    // Map reaction types to database fields
    switch (type) {
      case REACTION_TYPES.LIKE:
        updateData.likeCount = { [operation]: 1 };
        break;
      // For now, we'll use likeCount for all reactions, but this can be extended
      // to have separate counters for each reaction type if needed
      default:
        updateData.likeCount = { [operation]: 1 };
        break;
    }

    await prisma.post.update({
      where: { id: postId },
      data: updateData,
    });
  }

  private async updateCommentReactionCount(commentId: string, type: ReactionType, operation: 'increment' | 'decrement') {
    const updateData: any = {};
    
    // Map reaction types to database fields
    switch (type) {
      case REACTION_TYPES.LIKE:
        updateData.likeCount = { [operation]: 1 };
        break;
      // For now, we'll use likeCount for all reactions, but this can be extended
      // to have separate counters for each reaction type if needed
      default:
        updateData.likeCount = { [operation]: 1 };
        break;
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
    });
  }

  private async sendReactionNotification(targetType: 'post' | 'comment', targetId: string, userId: string, reactionType: ReactionType) {
    // Send notification based on reaction type
    if (targetType === 'post' && reactionType === REACTION_TYPES.LIKE) {
      await notificationService.notifyPostLiked(targetId, userId);
    }
    // Add more notification types as needed
  }

  // Legacy methods for backwards compatibility
  async togglePostReaction(postId: string, userId: string, type: string = 'like') {
    return this.addOrChangePostReaction(postId, userId, type as ReactionType);
  }

  async toggleCommentReaction(commentId: string, userId: string, type: string = 'like') {
    return this.addOrChangeCommentReaction(commentId, userId, type as ReactionType);
  }

  async getPostReactions(postId: string) {
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.groupReactionsByType(reactions);
  }

  async getCommentReactions(commentId: string) {
    const reactions = await prisma.reaction.findMany({
      where: { commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.groupReactionsByType(reactions);
  }

  async getPostReactionStats(postId: string) {
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      select: { type: true },
    });

    return this.calculateReactionStats(reactions);
  }

  async getCommentReactionStats(commentId: string) {
    const reactions = await prisma.reaction.findMany({
      where: { commentId },
      select: { type: true },
    });

    return this.calculateReactionStats(reactions);
  }

  private groupReactionsByType(reactions: any[]) {
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = [];
      }
      acc[reaction.type].push({
        id: reaction.id,
        user: reaction.user,
        createdAt: reaction.createdAt,
      });
      return acc;
    }, {});

    return {
      byType: grouped,
      total: reactions.length,
      summary: this.calculateReactionStats(reactions),
    };
  }

  private calculateReactionStats(reactions: { type: string }[]) {
    const stats = reactions.reduce((acc, reaction) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...stats,
      total: reactions.length,
    };
  }

  async getUserPostReaction(postId: string, userId: string) {
    return await prisma.reaction.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
  }

  async getUserCommentReaction(commentId: string, userId: string) {
    return await prisma.reaction.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });
  }

  // Get all available reaction types
  getAvailableReactionTypes() {
    return Object.values(REACTION_TYPES).map(type => ({
      type,
      emoji: this.getReactionEmoji(type),
      label: this.getReactionLabel(type),
    }));
  }

  private getReactionEmoji(type: ReactionType): string {
    const emojiMap = {
      [REACTION_TYPES.LIKE]: '👍',
      [REACTION_TYPES.LOVE]: '❤️',
      [REACTION_TYPES.LAUGH]: '😂',
      [REACTION_TYPES.ANGRY]: '😠',
      [REACTION_TYPES.SAD]: '😢',
      [REACTION_TYPES.CELEBRATE]: '🎉',
      [REACTION_TYPES.SUPPORT]: '🤝',
      [REACTION_TYPES.INSIGHTFUL]: '💡',
    };

    return emojiMap[type] || '👍';
  }

  private getReactionLabel(type: ReactionType): string {
    const labelMap = {
      [REACTION_TYPES.LIKE]: 'Like',
      [REACTION_TYPES.LOVE]: 'Love',
      [REACTION_TYPES.LAUGH]: 'Laugh',
      [REACTION_TYPES.ANGRY]: 'Angry',
      [REACTION_TYPES.SAD]: 'Sad',
      [REACTION_TYPES.CELEBRATE]: 'Celebrate',
      [REACTION_TYPES.SUPPORT]: 'Support',
      [REACTION_TYPES.INSIGHTFUL]: 'Insightful',
    };

    return labelMap[type] || 'Like';
  }

  // Validate reaction type
  isValidReactionType(type: string): type is ReactionType {
    return Object.values(REACTION_TYPES).includes(type as ReactionType);
  }
}

export const reactionService = new ReactionService();