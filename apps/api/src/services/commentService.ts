import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';

export class CommentService {
  async create(data: {
    content: string;
    postId: string;
    authorId: string;
    parentId?: string;
    attachments?: string[];
    richTextContent?: string;
  }) {
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        postId: data.postId,
        authorId: data.authorId,
        parentId: data.parentId,
        ...(data.attachments && { attachments: data.attachments }),
        ...(data.richTextContent && { richTextContent: data.richTextContent }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Send notification for new comment
    await notificationService.notifyNewComment(data.postId, comment.id, data.authorId);

    // Update comment count on post
    await prisma.post.update({
      where: { id: data.postId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  async getCommentById(id: string) {
    return await prisma.comment.findUnique({
      where: { id },
    });
  }

  async getPostById(id: string) {
    return await prisma.post.findUnique({
      where: { id },
    });
  }

  async listByPost(postId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          postId,
          parentId: null, // Top-level comments only
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          replies: {
            where: { deletedAt: null },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: { reactions: true },
          },
        },
      }),
      prisma.comment.count({
        where: {
          postId,
          parentId: null,
          deletedAt: null,
        },
      }),
    ]);

    return { comments, total };
  }

  async update(id: string, data: {
    content?: string;
    attachments?: string[];
    richTextContent?: string;
  }) {
    return await prisma.comment.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
        ...(data.richTextContent !== undefined && { richTextContent: data.richTextContent }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    return await prisma.comment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        content: '[Deleted]',
      },
    });
  }

  async reportComment(commentId: string, userId: string, reason: string, details?: string) {
    return await prisma.moderationLog.create({
      data: {
        action: 'FLAG',
        targetType: 'comment',
        targetId: commentId,
        moderatorId: userId,
        reason,
        notes: details,
      },
    });
  }

  async moderateComment(commentId: string, moderatorId: string, action: string, reason?: string, notes?: string) {
    // Create moderation log
    await prisma.moderationLog.create({
      data: {
        action: action as any,
        targetType: 'comment',
        targetId: commentId,
        moderatorId,
        reason,
        notes,
      },
    });

    // If action is DELETE, mark comment as deleted
    if (action === 'DELETE') {
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          deletedAt: new Date(),
          content: '[Deleted by moderator]'
        },
      });
    }

    return { success: true };
  }
}

export const commentService = new CommentService();