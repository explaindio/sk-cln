import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';

export class PostService {
  async create(data: {
    title: string;
    content: string;
    communityId: string;
    categoryId: string;
    authorId: string;
    attachments?: string[];
    richTextContent?: string;
  }) {
    return await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        communityId: data.communityId,
        categoryId: data.categoryId,
        authorId: data.authorId,
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
        category: true,
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    // Increment view count
    await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        category: true,
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });
  }

  async listByCommunity(communityId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          communityId,
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          category: true,
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
      }),
      prisma.post.count({
        where: {
          communityId,
          deletedAt: null,
        },
      }),
    ]);

    return { posts, total };
  }

  async update(id: string, data: {
    title?: string;
    content?: string;
    attachments?: string[];
    richTextContent?: string;
  }) {
    return await prisma.post.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.attachments !== undefined && { attachments: data.attachments }),
        ...(data.richTextContent !== undefined && { richTextContent: data.richTextContent }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    return await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reportPost(postId: string, userId: string, reason: string, details?: string) {
    return await prisma.moderationLog.create({
      data: {
        action: 'FLAG',
        targetType: 'post',
        targetId: postId,
        moderatorId: userId,
        reason,
        notes: details,
      },
    });
  }

  async moderatePost(postId: string, moderatorId: string, action: string, reason?: string, notes?: string) {
    // Create moderation log
    await prisma.moderationLog.create({
      data: {
        action: action as any,
        targetType: 'post',
        targetId: postId,
        moderatorId,
        reason,
        notes,
      },
    });

    // If action is DELETE, mark post as deleted
    if (action === 'DELETE') {
      await prisma.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      });
    }

    return { success: true };
  }
}

export const postService = new PostService();