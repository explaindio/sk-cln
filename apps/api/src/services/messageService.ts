import { prisma } from '../lib/prisma';
import { notificationService } from './notification.service';
import { socketService } from './socket.service';
import { ValidationError, NotFoundError } from '../utils/errors';

export class MessageService {
  async sendMessage(conversationId: string, senderId: string, content: string, type: string = 'text', attachments: string[] = []) {
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        messageType: type,
        ...(attachments.length > 0 && { attachments }),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Update last read time for sender
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Send notification for new message
    await notificationService.notifyNewMessage(conversationId, senderId, content);

    // Notify participants via WebSocket
    socketService.sendMessage(conversationId, message);

    return message;
  }

  async editMessage(messageId: string, userId: string, content: string, attachments?: string[]) {
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }

    // Verify user is the sender of the message
    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!existingMessage) {
      throw new NotFoundError('Message not found');
    }

    if (existingMessage.senderId !== userId) {
      throw new ValidationError('You can only edit your own messages');
    }

    if (existingMessage.conversation.participants.length === 0) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        ...(attachments !== undefined && { attachments }),
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Notify participants via WebSocket
    socketService.sendMessage(existingMessage.conversationId, {
      id: messageId,
      type: 'message_update',
      content,
      isEdited: true,
      editedAt: new Date(),
    });

    return updatedMessage;
  }

  async deleteMessage(messageId: string, userId: string) {
    // Verify user is the sender of the message
    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId },
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!existingMessage) {
      throw new NotFoundError('Message not found');
    }

    const userParticipant = existingMessage.conversation.participants[0];
    const isSender = existingMessage.senderId === userId;
    const isAdmin = userParticipant && userParticipant.user.role === 'ADMIN';

    if (!isSender && !isAdmin) {
      throw new ValidationError('You can only delete your own messages');
    }

    if (existingMessage.conversation.participants.length === 0) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    // Instead of deleting, mark as deleted to preserve conversation history
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
        messageType: 'deleted',
        isEdited: true,
        editedAt: new Date(),
      },
    });

    // Notify participants via WebSocket
    socketService.sendMessage(existingMessage.conversationId, {
      id: messageId,
      type: 'message_delete',
      isDeleted: true,
    });

    return { message: 'Message deleted successfully' };
  }

  async getMessages(conversationId: string, userId: string, limit: number = 50, cursor?: string) {
    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1,
      }),
    });

    const hasMore = messages.length > limit;
    const messageList = hasMore ? messages.slice(0, -1) : messages;

    return {
      messages: messageList,
      hasMore,
      nextCursor: hasMore ? messageList[messageList.length - 1]?.id : null,
    };
  }

  async getMessageHistory(conversationId: string, userId: string, options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    messageType?: string;
  } = {}) {
    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    // Build where clause
    const where: any = { conversationId };
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }
    
    if (options.messageType) {
      where.messageType = options.messageType;
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Chronological order for history
      },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    return messages;
  }

  async markAsRead(conversationId: string, userId: string) {
    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return { message: 'Conversation marked as read' };
  }
}

export const messageService = new MessageService();