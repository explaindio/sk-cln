import { Response } from 'express';
import { BaseController } from './baseController';
import { commentService } from '../services/commentService';
import { AuthRequest } from '../middleware/auth';

class CommentController extends BaseController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { content, postId, parentId, attachments, richTextContent } = req.body;

      // Check if post exists
      const post = await commentService.getPostById(postId);
      if (!post) {
        return this.sendError(res, 'Post not found', 404);
      }

      // Check if parent comment exists (for replies)
      if (parentId) {
        const parentComment = await commentService.getCommentById(parentId);
        if (!parentComment) {
          return this.sendError(res, 'Parent comment not found', 404);
        }
      }

      const comment = await commentService.create({
        content,
        postId,
        authorId: req.user.id,
        parentId,
        attachments,
        richTextContent,
      });

      this.sendSuccess(res, comment, 201);
    } catch (error) {
      this.sendError(res, 'Failed to create comment', 500);
    }
  }

  async listByPost(req: AuthRequest, res: Response) {
    try {
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Check if post exists
      const post = await commentService.getPostById(postId);
      if (!post) {
        return this.sendError(res, 'Post not found', 404);
      }

      const { comments, total } = await commentService.listByPost(postId, page, limit);

      this.sendPaginated(res, comments, page, limit, total);
    } catch (error) {
      this.sendError(res, 'Failed to fetch comments', 500);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, attachments, richTextContent } = req.body;

      // Check if comment exists and user is author
      const comment = await commentService.getCommentById(id);
      if (!comment) {
        return this.sendError(res, 'Comment not found', 404);
      }

      if (comment.authorId !== req.user.id) {
        return this.sendError(res, 'Not authorized', 403);
      }

      const updated = await commentService.update(id, { content, attachments, richTextContent });
      this.sendSuccess(res, updated);
    } catch (error) {
      this.sendError(res, 'Failed to update comment', 500);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if comment exists and user is author
      const comment = await commentService.getCommentById(id);
      if (!comment) {
        return this.sendError(res, 'Comment not found', 404);
      }

      if (comment.authorId !== req.user.id) {
        return this.sendError(res, 'Not authorized', 403);
      }

      await commentService.delete(id);
      this.sendSuccess(res, { message: 'Comment deleted successfully' });
    } catch (error) {
      this.sendError(res, 'Failed to delete comment', 500);
    }
  }

  async reply(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content, attachments, richTextContent } = req.body;

      // Check if parent comment exists
      const parentComment = await commentService.getCommentById(id);
      if (!parentComment) {
        return this.sendError(res, 'Parent comment not found', 404);
      }

      const comment = await commentService.create({
        content,
        postId: parentComment.postId,
        authorId: req.user.id,
        parentId: id,
        attachments,
        richTextContent,
      });

      this.sendSuccess(res, comment, 201);
    } catch (error) {
      this.sendError(res, 'Failed to create reply', 500);
    }
  }

  async report(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason, details } = req.body;
      const userId = req.user.id;

      // Check if comment exists
      const comment = await commentService.getCommentById(id);
      if (!comment) {
        return this.sendError(res, 'Comment not found', 404);
      }

      // Create moderation log for the comment report
      // This is a simplified implementation - in a real app, you might want to use a dedicated service
      await commentService.reportComment(id, userId, reason, details);
      this.sendSuccess(res, { message: 'Comment reported successfully' });
    } catch (error) {
      this.sendError(res, 'Failed to report comment', 500);
    }
  }

  async moderate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action, reason, notes } = req.body;
      const moderatorId = req.user.id;

      // Check if user is a moderator
      // This would typically check user permissions

      await commentService.moderateComment(id, moderatorId, action, reason, notes);
      this.sendSuccess(res, { message: `Comment ${action.toLowerCase()}d successfully` });
    } catch (error) {
      this.sendError(res, 'Failed to moderate comment', 500);
    }
  }
}

export const commentController = new CommentController();