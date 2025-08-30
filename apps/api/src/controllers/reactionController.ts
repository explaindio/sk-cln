import { Response } from 'express';
import { BaseController } from './baseController';
import { reactionService, REACTION_TYPES } from '../services/reactionService';
import { AuthRequest } from '../middleware/auth';

class ReactionController extends BaseController {
  async addOrChange(req: AuthRequest, res: Response) {
    try {
      const { type, targetType, targetId } = req.body;
      const userId = req.user.id;

      // Validate reaction type
      if (!reactionService.isValidReactionType(type)) {
        return this.sendError(res, 'Invalid reaction type', 400);
      }

      let result;
      if (targetType === 'post') {
        result = await reactionService.addOrChangePostReaction(targetId, userId, type);
      } else if (targetType === 'comment') {
        result = await reactionService.addOrChangeCommentReaction(targetId, userId, type);
      } else {
        return this.sendError(res, 'Invalid target type', 400);
      }

      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, 'Failed to add/change reaction', 500);
    }
  }

  // Legacy toggle method for backwards compatibility
  async toggle(req: AuthRequest, res: Response) {
    try {
      const { type, targetType, targetId } = req.body;
      const userId = req.user.id;

      // Validate reaction type
      if (!reactionService.isValidReactionType(type)) {
        return this.sendError(res, 'Invalid reaction type', 400);
      }

      let result;
      if (targetType === 'post') {
        result = await reactionService.togglePostReaction(targetId, userId, type);
      } else if (targetType === 'comment') {
        result = await reactionService.toggleCommentReaction(targetId, userId, type);
      } else {
        return this.sendError(res, 'Invalid target type', 400);
      }

      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, 'Failed to toggle reaction', 500);
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const { targetType, targetId } = req.params;
      
      let reactions;
      if (targetType === 'post') {
        reactions = await reactionService.getPostReactions(targetId);
      } else if (targetType === 'comment') {
        reactions = await reactionService.getCommentReactions(targetId);
      } else {
        return this.sendError(res, 'Invalid target type', 400);
      }

      this.sendSuccess(res, reactions);
    } catch (error) {
      this.sendError(res, 'Failed to fetch reactions', 500);
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      const { targetType, targetId } = req.params;
      
      let stats;
      if (targetType === 'post') {
        stats = await reactionService.getPostReactionStats(targetId);
      } else if (targetType === 'comment') {
        stats = await reactionService.getCommentReactionStats(targetId);
      } else {
        return this.sendError(res, 'Invalid target type', 400);
      }

      this.sendSuccess(res, stats);
    } catch (error) {
      this.sendError(res, 'Failed to fetch reaction stats', 500);
    }
  }

  async getUserReaction(req: AuthRequest, res: Response) {
    try {
      const { targetType, targetId } = req.params;
      const userId = req.user.id;
      
      let reaction;
      if (targetType === 'post') {
        reaction = await reactionService.getUserPostReaction(targetId, userId);
      } else if (targetType === 'comment') {
        reaction = await reactionService.getUserCommentReaction(targetId, userId);
      } else {
        return this.sendError(res, 'Invalid target type', 400);
      }

      this.sendSuccess(res, reaction || null);
    } catch (error) {
      this.sendError(res, 'Failed to fetch user reaction', 500);
    }
  }

  async getAvailableTypes(req: AuthRequest, res: Response) {
    try {
      const availableTypes = reactionService.getAvailableReactionTypes();
      this.sendSuccess(res, availableTypes);
    } catch (error) {
      this.sendError(res, 'Failed to fetch available reaction types', 500);
    }
  }
}

export const reactionController = new ReactionController();