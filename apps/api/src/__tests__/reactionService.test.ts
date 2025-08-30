import { ReactionService, REACTION_TYPES, ReactionType } from '../services/reactionService';
import { prisma } from '../lib/prisma';
import { notificationService } from '../services/notification.service';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  prisma: {
    reaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    post: {
      update: jest.fn(),
    },
    comment: {
      update: jest.fn(),
    },
  },
}));

jest.mock('../services/notification.service', () => ({
  notificationService: {
    notifyPostLiked: jest.fn(),
  },
}));

const mockPrisma = {
  reaction: {
    findUnique: prisma.reaction.findUnique as jest.MockedFunction<typeof prisma.reaction.findUnique>,
    create: prisma.reaction.create as jest.MockedFunction<typeof prisma.reaction.create>,
    update: prisma.reaction.update as jest.MockedFunction<typeof prisma.reaction.update>,
    delete: prisma.reaction.delete as jest.MockedFunction<typeof prisma.reaction.delete>,
    findMany: prisma.reaction.findMany as jest.MockedFunction<typeof prisma.reaction.findMany>,
  },
  post: {
    update: prisma.post.update as jest.MockedFunction<typeof prisma.post.update>,
  },
  comment: {
    update: prisma.comment.update as jest.MockedFunction<typeof prisma.comment.update>,
  },
};

const mockNotificationService = {
  notifyPostLiked: notificationService.notifyPostLiked as jest.MockedFunction<typeof notificationService.notifyPostLiked>,
};

describe('ReactionService', () => {
  let reactionService: ReactionService;

  beforeEach(() => {
    reactionService = new ReactionService();
    jest.clearAllMocks();
  });

  describe('REACTION_TYPES', () => {
    it('should contain all expected reaction types', () => {
      expect(REACTION_TYPES.LIKE).toBe('like');
      expect(REACTION_TYPES.LOVE).toBe('love');
      expect(REACTION_TYPES.LAUGH).toBe('laugh');
      expect(REACTION_TYPES.ANGRY).toBe('angry');
      expect(REACTION_TYPES.SAD).toBe('sad');
      expect(REACTION_TYPES.CELEBRATE).toBe('celebrate');
      expect(REACTION_TYPES.SUPPORT).toBe('support');
      expect(REACTION_TYPES.INSIGHTFUL).toBe('insightful');
    });
  });

  describe('addOrChangePostReaction', () => {
    const postId = 'post-123';
    const userId = 'user-456';
    const reactionType: ReactionType = REACTION_TYPES.LIKE;

    it('should add new reaction when none exists', async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      mockPrisma.reaction.create.mockResolvedValue({
        id: 'reaction-1',
        type: reactionType,
        userId,
        postId,
        commentId: null,
        createdAt: new Date(),
      } as any);

      const result = await reactionService.addOrChangePostReaction(postId, userId, reactionType);

      expect(result.action).toBe('added');
      expect(result.newType).toBe(reactionType);
      expect(mockPrisma.reaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          postId,
          type: reactionType,
        },
      });
      expect(mockNotificationService.notifyPostLiked).toHaveBeenCalledWith(postId, userId);
    });

    it('should remove reaction when same type exists', async () => {
      const existingReaction = {
        id: 'reaction-1',
        type: reactionType,
        userId,
        postId,
        commentId: null,
        createdAt: new Date(),
      } as any;

      mockPrisma.reaction.findUnique.mockResolvedValue(existingReaction);

      const result = await reactionService.addOrChangePostReaction(postId, userId, reactionType);

      expect(result.action).toBe('removed');
      expect(result.previousType).toBe(reactionType);
      expect(mockPrisma.reaction.delete).toHaveBeenCalledWith({
        where: { id: existingReaction.id },
      });
    });

    it('should change reaction type when different type exists', async () => {
      const existingReaction = {
        id: 'reaction-1',
        type: REACTION_TYPES.LOVE,
        userId,
        postId,
        commentId: null,
        createdAt: new Date(),
      } as any;

      mockPrisma.reaction.findUnique.mockResolvedValue(existingReaction);
      mockPrisma.reaction.update.mockResolvedValue({
        ...existingReaction,
        type: reactionType,
      } as any);

      const result = await reactionService.addOrChangePostReaction(postId, userId, reactionType);

      expect(result.action).toBe('changed');
      expect(result.previousType).toBe(REACTION_TYPES.LOVE);
      expect(result.newType).toBe(reactionType);
      expect(mockPrisma.reaction.update).toHaveBeenCalledWith({
        where: { id: existingReaction.id },
        data: { type: reactionType, updatedAt: expect.any(Date) },
      });
    });
  });

  describe('addOrChangeCommentReaction', () => {
    const commentId = 'comment-123';
    const userId = 'user-456';
    const reactionType: ReactionType = REACTION_TYPES.SUPPORT;

    it('should add new reaction when none exists', async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      mockPrisma.reaction.create.mockResolvedValue({
        id: 'reaction-1',
        type: reactionType,
        userId,
        postId: null,
        commentId,
        createdAt: new Date(),
      } as any);

      const result = await reactionService.addOrChangeCommentReaction(commentId, userId, reactionType);

      expect(result.action).toBe('added');
      expect(result.newType).toBe(reactionType);
      expect(mockPrisma.reaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          commentId,
          type: reactionType,
        },
      });
    });

    it('should change reaction type when different type exists', async () => {
      const existingReaction = {
        id: 'reaction-1',
        type: REACTION_TYPES.CELEBRATE,
        userId,
        postId: null,
        commentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.reaction.findUnique.mockResolvedValue(existingReaction);
      mockPrisma.reaction.update.mockResolvedValue({
        ...existingReaction,
        type: reactionType,
      } as any);

      const result = await reactionService.addOrChangeCommentReaction(commentId, userId, reactionType);

      expect(result.action).toBe('changed');
      expect(result.previousType).toBe(REACTION_TYPES.CELEBRATE);
      expect(result.newType).toBe(reactionType);
    });
  });

  describe('getPostReactionStats', () => {
    const postId = 'post-123';

    it('should calculate reaction statistics correctly', async () => {
      const mockReactions = [
        { type: REACTION_TYPES.LIKE },
        { type: REACTION_TYPES.LIKE },
        { type: REACTION_TYPES.LOVE },
        { type: REACTION_TYPES.CELEBRATE },
        { type: REACTION_TYPES.CELEBRATE },
        { type: REACTION_TYPES.CELEBRATE },
      ];

      mockPrisma.reaction.findMany.mockResolvedValue(mockReactions as any);

      const result = await reactionService.getPostReactionStats(postId);

      expect(result).toEqual({
        [REACTION_TYPES.LIKE]: 2,
        [REACTION_TYPES.LOVE]: 1,
        [REACTION_TYPES.CELEBRATE]: 3,
        total: 6,
      });

      expect(mockPrisma.reaction.findMany).toHaveBeenCalledWith({
        where: { postId },
        select: { type: true },
      });
    });

    it('should return empty stats when no reactions exist', async () => {
      mockPrisma.reaction.findMany.mockResolvedValue([]);

      const result = await reactionService.getPostReactionStats(postId);

      expect(result).toEqual({
        total: 0,
      });
    });
  });

  describe('getAvailableReactionTypes', () => {
    it('should return all available reaction types with emojis and labels', () => {
      const result = reactionService.getAvailableReactionTypes();

      expect(result).toHaveLength(8);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: REACTION_TYPES.LIKE,
            emoji: '👍',
            label: 'Like',
          }),
          expect.objectContaining({
            type: REACTION_TYPES.LOVE,
            emoji: '❤️',
            label: 'Love',
          }),
          expect.objectContaining({
            type: REACTION_TYPES.CELEBRATE,
            emoji: '🎉',
            label: 'Celebrate',
          }),
          expect.objectContaining({
            type: REACTION_TYPES.SUPPORT,
            emoji: '🤝',
            label: 'Support',
          }),
          expect.objectContaining({
            type: REACTION_TYPES.INSIGHTFUL,
            emoji: '💡',
            label: 'Insightful',
          }),
        ])
      );
    });
  });

  describe('isValidReactionType', () => {
    it('should return true for valid reaction types', () => {
      expect(reactionService.isValidReactionType(REACTION_TYPES.LIKE)).toBe(true);
      expect(reactionService.isValidReactionType(REACTION_TYPES.CELEBRATE)).toBe(true);
      expect(reactionService.isValidReactionType(REACTION_TYPES.INSIGHTFUL)).toBe(true);
    });

    it('should return false for invalid reaction types', () => {
      expect(reactionService.isValidReactionType('invalid')).toBe(false);
      expect(reactionService.isValidReactionType('dislike')).toBe(false);
      expect(reactionService.isValidReactionType('')).toBe(false);
    });
  });

  describe('getPostReactions (with grouping)', () => {
    const postId = 'post-123';

    it('should group reactions by type and provide summary', async () => {
      const mockReactions = [
        {
          id: '1',
          type: REACTION_TYPES.LIKE,
          user: { id: 'user1', username: 'user1', avatarUrl: null },
          createdAt: new Date(),
        },
        {
          id: '2',
          type: REACTION_TYPES.LIKE,
          user: { id: 'user2', username: 'user2', avatarUrl: null },
          createdAt: new Date(),
        },
        {
          id: '3',
          type: REACTION_TYPES.LOVE,
          user: { id: 'user3', username: 'user3', avatarUrl: null },
          createdAt: new Date(),
        },
      ];

      mockPrisma.reaction.findMany.mockResolvedValue(mockReactions as any);

      const result = await reactionService.getPostReactions(postId);

      expect(result.total).toBe(3);
      expect(result.byType[REACTION_TYPES.LIKE]).toHaveLength(2);
      expect(result.byType[REACTION_TYPES.LOVE]).toHaveLength(1);
      expect(result.summary).toEqual({
        [REACTION_TYPES.LIKE]: 2,
        [REACTION_TYPES.LOVE]: 1,
        total: 3,
      });
    });

    it('should handle empty reactions list', async () => {
      mockPrisma.reaction.findMany.mockResolvedValue([]);

      const result = await reactionService.getPostReactions(postId);

      expect(result.total).toBe(0);
      expect(result.byType).toEqual({});
      expect(result.summary).toEqual({
        total: 0,
      });
    });
  });

  describe('Legacy compatibility methods', () => {
    it('should maintain backward compatibility with togglePostReaction', async () => {
      const postId = 'post-123';
      const userId = 'user-456';
      const type = 'like';

      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      mockPrisma.reaction.create.mockResolvedValue({
        id: 'reaction-1',
        type,
        userId,
        postId,
        commentId: null,
        createdAt: new Date(),
      } as any);

      const result = await reactionService.togglePostReaction(postId, userId, type);

      expect(result.action).toBe('added');
      expect(result.newType).toBe(type);
    });

    it('should maintain backward compatibility with toggleCommentReaction', async () => {
      const commentId = 'comment-123';
      const userId = 'user-456';
      const type = 'like';

      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      mockPrisma.reaction.create.mockResolvedValue({
        id: 'reaction-1',
        type,
        userId,
        postId: null,
        commentId,
        createdAt: new Date(),
      } as any);

      const result = await reactionService.toggleCommentReaction(commentId, userId, type);

      expect(result.action).toBe('added');
      expect(result.newType).toBe(type);
    });
  });
});