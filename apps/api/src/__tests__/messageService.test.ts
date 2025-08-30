import { messageService } from '../services/messageService';
import { prisma } from '../lib/prisma';
import { socketService } from '../services/socket.service';
import { notificationService } from '../services/notification.service';

// Mock the dependencies
jest.mock('../lib/prisma', () => ({
  prisma: {
    conversationParticipant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    conversation: {
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../services/socket.service', () => ({
  socketService: {
    sendMessage: jest.fn(),
    updateConversation: jest.fn(),
  },
}));

jest.mock('../services/notification.service', () => ({
  notificationService: {
    notifyNewMessage: jest.fn(),
  },
}));

describe('MessageService', () => {
  const mockConversationId = 'conversation-123';
  const mockUserId = 'user-123';
  const mockSenderId = 'sender-123';
  const mockContent = 'Test message';
  const mockType = 'text';
  const mockAttachments = ['file1.jpg', 'file2.png'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should create a new message with attachments', async () => {
      const mockMessage = {
        id: 'message-123',
        conversationId: mockConversationId,
        senderId: mockSenderId,
        content: mockContent,
        messageType: mockType,
        attachments: mockAttachments,
        sender: {
          id: mockSenderId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'avatar.jpg',
        },
      };

      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        id: 'participant-123',
        conversationId: mockConversationId,
        userId: mockSenderId,
      });

      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(
        mockConversationId,
        mockSenderId,
        mockContent,
        mockType,
        mockAttachments
      );

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: mockConversationId,
          senderId: mockSenderId,
          content: mockContent,
          messageType: mockType,
          attachments: mockAttachments,
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
    });

    it('should create a new message without attachments', async () => {
      const mockMessage = {
        id: 'message-123',
        conversationId: mockConversationId,
        senderId: mockSenderId,
        content: mockContent,
        messageType: mockType,
        sender: {
          id: mockSenderId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'avatar.jpg',
        },
      };

      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        id: 'participant-123',
        conversationId: mockConversationId,
        userId: mockSenderId,
      });

      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(
        mockConversationId,
        mockSenderId,
        mockContent,
        mockType
      );

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: mockConversationId,
          senderId: mockSenderId,
          content: mockContent,
          messageType: mockType,
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
    });

    it('should throw NotFoundError when user is not a participant', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        messageService.sendMessage(mockConversationId, mockSenderId, mockContent)
      ).rejects.toThrow('Conversation not found or access denied');
    });
  });

  describe('editMessage', () => {
    const mockMessageId = 'message-123';

    it('should edit a message with new content and attachments', async () => {
      const updatedContent = 'Updated message';
      const updatedAttachments = ['newfile.jpg'];

      const mockExistingMessage = {
        id: mockMessageId,
        senderId: mockSenderId,
        conversation: {
          participants: [{ userId: mockSenderId }],
        },
      };

      const mockUpdatedMessage = {
        id: mockMessageId,
        content: updatedContent,
        attachments: updatedAttachments,
        isEdited: true,
        editedAt: new Date(),
        sender: {
          id: mockSenderId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'avatar.jpg',
        },
      };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockExistingMessage);
      (prisma.message.update as jest.Mock).mockResolvedValue(mockUpdatedMessage);

      const result = await messageService.editMessage(
        mockMessageId,
        mockSenderId,
        updatedContent,
        updatedAttachments
      );

      expect(result).toEqual(mockUpdatedMessage);
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: mockMessageId },
        data: {
          content: updatedContent,
          attachments: updatedAttachments,
          isEdited: true,
          editedAt: expect.any(Date),
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
    });

    it('should edit a message with new content only', async () => {
      const updatedContent = 'Updated message';

      const mockExistingMessage = {
        id: mockMessageId,
        senderId: mockSenderId,
        conversation: {
          participants: [{ userId: mockSenderId }],
        },
      };

      const mockUpdatedMessage = {
        id: mockMessageId,
        content: updatedContent,
        isEdited: true,
        editedAt: new Date(),
        sender: {
          id: mockSenderId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: 'avatar.jpg',
        },
      };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockExistingMessage);
      (prisma.message.update as jest.Mock).mockResolvedValue(mockUpdatedMessage);

      const result = await messageService.editMessage(mockMessageId, mockSenderId, updatedContent);

      expect(result).toEqual(mockUpdatedMessage);
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: mockMessageId },
        data: {
          content: updatedContent,
          isEdited: true,
          editedAt: expect.any(Date),
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
    });

    it('should throw NotFoundError when message does not exist', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        messageService.editMessage(mockMessageId, mockSenderId, 'Updated content')
      ).rejects.toThrow('Message not found');
    });

    it('should throw ValidationError when user is not the sender', async () => {
      const mockExistingMessage = {
        id: mockMessageId,
        senderId: 'different-user',
        conversation: {
          participants: [{ userId: mockSenderId }],
        },
      };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockExistingMessage);

      await expect(
        messageService.editMessage(mockMessageId, mockSenderId, 'Updated content')
      ).rejects.toThrow('You can only edit your own messages');
    });
  });

  describe('deleteMessage', () => {
    const mockMessageId = 'message-123';

    it('should mark a message as deleted', async () => {
      const mockExistingMessage = {
        id: mockMessageId,
        senderId: mockSenderId,
        conversation: {
          participants: [{ userId: mockSenderId, user: { role: 'USER' } }],
        },
      };

      const mockUpdatedMessage = {
        id: mockMessageId,
        content: '[Message deleted]',
        messageType: 'deleted',
        isEdited: true,
        editedAt: new Date(),
      };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockExistingMessage);
      (prisma.message.update as jest.Mock).mockResolvedValue(mockUpdatedMessage);

      const result = await messageService.deleteMessage(mockMessageId, mockSenderId);

      expect(result).toEqual({ message: 'Message deleted successfully' });
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: mockMessageId },
        data: {
          content: '[Message deleted]',
          messageType: 'deleted',
          isEdited: true,
          editedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundError when message does not exist', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        messageService.deleteMessage(mockMessageId, mockSenderId)
      ).rejects.toThrow('Message not found');
    });

    it('should throw ValidationError when user is not the sender', async () => {
      const mockExistingMessage = {
        id: mockMessageId,
        senderId: 'different-user',
        conversation: {
          participants: [{ userId: mockSenderId, user: { role: 'USER' } }],
        },
      };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockExistingMessage);

      await expect(
        messageService.deleteMessage(mockMessageId, mockSenderId)
      ).rejects.toThrow('You can only delete your own messages');
    });
  });

  describe('getMessageHistory', () => {
    it('should return message history with date range filter', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const mockMessages = [
        {
          id: 'message-1',
          content: 'First message',
          createdAt: new Date('2023-06-01'),
          sender: {
            id: mockSenderId,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            avatarUrl: 'avatar.jpg',
          },
        },
      ];

      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        id: 'participant-123',
        conversationId: mockConversationId,
        userId: mockUserId,
      });

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await messageService.getMessageHistory(mockConversationId, mockUserId, {
        startDate,
        endDate,
        limit: 10,
      });

      expect(result).toEqual(mockMessages);
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: mockConversationId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
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
          createdAt: 'asc',
        },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('getMessages', () => {
    it('should return messages with pagination', async () => {
      const mockMessages = [
        {
          id: 'message-1',
          content: 'First message',
          sender: {
            id: mockSenderId,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            avatarUrl: 'avatar.jpg',
          },
        },
      ];

      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({
        id: 'participant-123',
        conversationId: mockConversationId,
        userId: mockUserId,
      });

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await messageService.getMessages(mockConversationId, mockUserId, 20, 'cursor-123');

      expect(result).toEqual({
        messages: mockMessages,
        hasMore: false,
        nextCursor: null,
      });
    });
  });
});