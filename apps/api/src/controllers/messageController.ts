import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { socketService } from '../services/socket.service';
import { messageService } from '../services/messageService';
import { AuthRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
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
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { participantId, type = 'direct', name } = req.body;
    const creatorId = req.user!.id;

    if (!participantId) {
      throw new ValidationError('Participant ID is required');
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'direct',
          participants: {
            every: {
              userId: {
                in: [creatorId, participantId],
              },
            },
          },
        },
        include: {
          participants: true,
        },
      });

      if (existingConversation && existingConversation.participants.length === 2) {
        return res.json(existingConversation);
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        type,
        name,
        createdBy: creatorId,
        participants: {
          create: [
            { userId: creatorId },
            { userId: participantId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(conversation);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;
    const { limit = 50, cursor } = req.query;

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
      take: parseInt(limit as string) + 1,
      ...(cursor && {
        cursor: {
          id: cursor as string,
        },
        skip: 1,
      }),
    });

    const hasMore = messages.length > parseInt(limit as string);
    const messageList = hasMore ? messages.slice(0, -1) : messages;

    res.json({
      messages: messageList,
      hasMore,
      nextCursor: hasMore ? messageList[messageList.length - 1]?.id : null,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text', attachments = [] } = req.body;
    const senderId = req.user!.id;

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

    const message = await messageService.sendMessage(conversationId, senderId, content, type, attachments);

    res.status(201).json(message);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

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

    res.json({ message: 'Conversation marked as read' });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConversationDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

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

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    res.json(conversation);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addParticipant = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId: newParticipantId } = req.body;
    const requesterId = req.user!.id;

    // Verify requester is participant in conversation
    const requester = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: requesterId,
        },
      },
    });

    if (!requester) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: newParticipantId,
        },
      },
    });

    if (existingParticipant) {
      throw new ValidationError('User is already a participant');
    }

    const participant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId: newParticipantId,
      },
      include: {
        user: {
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
    socketService.updateConversation(conversationId, {
      type: 'participant_added',
      participant,
    });

    res.status(201).json(participant);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeParticipant = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId: removeParticipantId } = req.body;
    const requesterId = req.user!.id;

    // Verify requester is participant in conversation
    const requester = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: requesterId,
        },
      },
    });

    if (!requester) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    // Check if participant exists
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: removeParticipantId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundError('Participant not found');
    }

    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: removeParticipantId,
        },
      },
    });

    // Notify participants via WebSocket
    socketService.updateConversation(conversationId, {
      type: 'participant_removed',
      removedUserId: removeParticipantId,
    });

    res.json({ message: 'Participant removed successfully' });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleReaction = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { type = 'like' } = req.body;
    const userId = req.user!.id;

    // Verify message exists and user has access to it
    const message = await prisma.message.findUnique({
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

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    if (message.conversation.participants.length === 0) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    // Get current reactions
    const currentReactions = (message.reactions as any[]) || [];
    const existingReactionIndex = currentReactions.findIndex(
      (reaction) => reaction.userId === userId && reaction.type === type
    );

    let updatedReactions;
    let action;

    if (existingReactionIndex >= 0) {
      // Remove existing reaction
      updatedReactions = currentReactions.filter((_, index) => index !== existingReactionIndex);
      action = 'removed';
    } else {
      // Add new reaction
      const newReaction = {
        userId,
        type,
        createdAt: new Date().toISOString(),
      };
      updatedReactions = [...currentReactions, newReaction];
      action = 'added';
    }

    // Update message with new reactions
    await prisma.message.update({
      where: { id: messageId },
      data: {
        reactions: updatedReactions,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    // Notify participants via WebSocket
    socketService.sendMessage(message.conversationId, {
      id: messageId,
      type: 'reaction_update',
      action,
      reactionType: type,
      userId,
      reactions: updatedReactions,
    });

    res.json({
      message: `Reaction ${action} successfully`,
      reactions: updatedReactions,
      action,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { query, limit = 20, cursor, senderId, messageType, startDate, endDate } = req.query;
    const userId = req.user!.id;

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

    // Build search criteria
    const searchCriteria: any = { conversationId };
    
    // Text search
    if (query && typeof query === 'string' && query.trim().length > 0) {
      searchCriteria.content = {
        contains: query.trim(),
        mode: 'insensitive',
      };
    }
    
    // Sender filter
    if (senderId && typeof senderId === 'string') {
      searchCriteria.senderId = senderId;
    }
    
    // Message type filter
    if (messageType && typeof messageType === 'string') {
      searchCriteria.messageType = messageType;
    }
    
    // Date range filter
    if (startDate || endDate) {
      searchCriteria.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        searchCriteria.createdAt.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        searchCriteria.createdAt.lte = new Date(endDate);
      }
    }

    // Search messages
    const messages = await prisma.message.findMany({
      where: searchCriteria,
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
      take: parseInt(limit as string) + 1,
      ...(cursor && {
        cursor: {
          id: cursor as string,
        },
        skip: 1,
      }),
    });

    const hasMore = messages.length > parseInt(limit as string);
    const messageList = hasMore ? messages.slice(0, -1) : messages;

    res.json({
      messages: messageList,
      hasMore,
      nextCursor: hasMore ? messageList[messageList.length - 1]?.id : null,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { format = 'json' } = req.query;
    const userId = req.user!.id;

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

    // Get conversation details
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const exportData = {
      conversationId: conversation.id,
      type: conversation.type,
      name: conversation.name,
      participantCount: conversation.participants.length,
      messageCount: conversation.messages.length,
      exportedAt: new Date().toISOString(),
      participants: conversation.participants.map(p => ({
        id: p.user.id,
        username: p.user.username,
        name: `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim(),
        joinedAt: p.joinedAt,
      })),
      messages: conversation.messages.map(message => ({
        id: message.id,
        sender: {
          id: message.sender.id,
          username: message.sender.username,
          name: `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim(),
        },
        content: message.content,
        messageType: message.messageType,
        isEdited: message.isEdited,
        isPinned: message.isPinned,
        reactions: message.reactions || [],
        createdAt: message.createdAt,
        editedAt: message.editedAt,
      })),
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['Timestamp', 'Sender', 'Content', 'Type', 'Edited', 'Pinned', 'Reactions'];
      const csvRows = exportData.messages.map(message => [
        message.createdAt,
        message.sender.name || message.sender.username,
        `"${message.content.replace(/"/g, '""')}"`,
        message.messageType,
        message.isEdited ? 'Yes' : 'No',
        message.isPinned ? 'Yes' : 'No',
        JSON.stringify(message.reactions),
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.csv"`);
      res.send(csvContent);
    } else {
      // Default to JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.json"`);
      res.json(exportData);
    }
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleMessagePin = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    // Verify message exists and user has access to it
    const message = await prisma.message.findUnique({
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

    if (!message) {
      throw new NotFoundError('Message not found');
    }

    if (message.conversation.participants.length === 0) {
      throw new NotFoundError('Conversation not found or access denied');
    }

    // Toggle pin status
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isPinned: !message.isPinned,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    // Notify participants via WebSocket
    socketService.sendMessage(message.conversationId, {
      id: messageId,
      type: 'pin_update',
      isPinned: updatedMessage.isPinned,
      userId,
    });

    res.json({
      message: `Message ${updatedMessage.isPinned ? 'pinned' : 'unpinned'} successfully`,
      isPinned: updatedMessage.isPinned,
    });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content, attachments } = req.body;
    const userId = req.user!.id;

    const message = await messageService.editMessage(messageId, userId, content, attachments);

    res.json(message);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    const result = await messageService.deleteMessage(messageId, userId);

    res.json(result);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessageHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;
    const { startDate, endDate, limit, offset, messageType } = req.query;

    const options: any = {};
    
    if (startDate) {
      options.startDate = new Date(startDate as string);
    }
    
    if (endDate) {
      options.endDate = new Date(endDate as string);
    }
    
    if (limit) {
      options.limit = parseInt(limit as string);
    }
    
    if (offset) {
      options.offset = parseInt(offset as string);
    }
    
    if (messageType) {
      options.messageType = messageType;
    }

    const messages = await messageService.getMessageHistory(conversationId, userId, options);

    res.json(messages);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};