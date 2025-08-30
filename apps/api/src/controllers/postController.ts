import { Response } from 'express';
import { BaseController } from './baseController';
import { postService } from '../services/postService';
import { memberService } from '../services/memberService';
import { AuthRequest } from '../middleware/auth';

class PostController extends BaseController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { title, content, communityId, categoryId, attachments, richTextContent } = req.body;

      // Check if user is member
      const role = await memberService.getMemberRole(communityId, req.user.id);
      if (!role) {
        return this.sendError(res, 'Must be a member to post', 403);
      }

      const post = await postService.create({
        title,
        content,
        communityId,
        categoryId,
        authorId: req.user.id,
        attachments,
        richTextContent,
      });

      this.sendSuccess(res, post, 201);
    } catch (error) {
      this.sendError(res, 'Failed to create post', 500);
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const post = await postService.findById(id);

      if (!post) {
        return this.sendError(res, 'Post not found', 404);
      }

      this.sendSuccess(res, post);
    } catch (error) {
      this.sendError(res, 'Failed to fetch post', 500);
    }
  }

  async listByCommunity(req: AuthRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { posts, total } = await postService.listByCommunity(communityId, page, limit);

      this.sendPaginated(res, posts, page, limit, total);
    } catch (error) {
      this.sendError(res, 'Failed to fetch posts', 500);
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, content, attachments, richTextContent } = req.body;

      // Check if user is author
      const post = await postService.findById(id);
      if (post?.author.id !== req.user.id) {
        return this.sendError(res, 'Not authorized', 403);
      }

      const updated = await postService.update(id, { title, content, attachments, richTextContent });
      this.sendSuccess(res, updated);
    } catch (error) {
      this.sendError(res, 'Failed to update post', 500);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if user is author
      const post = await postService.findById(id);
      if (!post) {
        return this.sendError(res, 'Post not found', 404);
      }

      if (post.author.id !== req.user.id) {
        return this.sendError(res, 'Not authorized', 403);
      }

      await postService.delete(id);
      this.sendSuccess(res, { message: 'Post deleted successfully' }, 204);
    } catch (error) {
      this.sendError(res, 'Failed to delete post', 500);
    }
  }

  async report(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason, details } = req.body;
      const userId = req.user.id;

      // Check if post exists
      const post = await postService.findById(id);
      if (!post) {
        return this.sendError(res, 'Post not found', 404);
      }

      await postService.reportPost(id, userId, reason, details);
      this.sendSuccess(res, { message: 'Post reported successfully' });
    } catch (error) {
      this.sendError(res, 'Failed to report post', 500);
    }
  }

  async moderate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { action, reason, notes } = req.body;
      const moderatorId = req.user.id;

      // Check if user is a moderator
      // This would typically check user permissions

      await postService.moderatePost(id, moderatorId, action, reason, notes);
      this.sendSuccess(res, { message: `Post ${action.toLowerCase()}d successfully` });
    } catch (error) {
      this.sendError(res, 'Failed to moderate post', 500);
    }
  }
}

export const postController = new PostController();