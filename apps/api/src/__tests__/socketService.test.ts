import { SocketService } from '../services/socket.service';
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';

// Mock the dependencies
jest.mock('socket.io', () => {
  const mockServer = {
    use: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };
  
  return {
    Server: jest.fn(() => mockServer),
  };
});

jest.mock('../lib/prisma', () => ({
  prisma: {
    conversationParticipant: {
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

describe('SocketService', () => {
  let socketService: SocketService;
  let mockHttpServer: HttpServer;
  let mockIo: any;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockHttpServer = {} as HttpServer;
    mockIo = new SocketServer(mockHttpServer);
    
    // Create a new instance of SocketService for each test
    socketService = new SocketService(mockHttpServer);
    
    // Mock socket object
    mockSocket = {
      id: 'socket-123',
      data: { userId: 'user-123' },
      handshake: { auth: { token: 'test-token' } },
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  describe('constructor', () => {
    it('should initialize socket server with correct configuration', () => {
      expect(SocketServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: 'http://localhost:3000',
          credentials: true,
        },
      });
    });
  });

  describe('handleConnection', () => {
    it('should track user socket and join user to rooms', async () => {
      const mockConversations = [
        { conversationId: 'conv-1' },
        { conversationId: 'conv-2' },
      ];
      
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue(mockConversations);
      
      // Call the private method through reflection
      const handleConnection = (socketService as any).handleConnection.bind(socketService);
      await handleConnection(mockSocket);
      
      // Verify user socket tracking
      expect((socketService as any).userSockets.has('user-123')).toBe(true);
      expect((socketService as any).userSockets.get('user-123')).toContain('socket-123');
      
      // Verify socket joins user room
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-123');
      
      // Verify socket joins conversation rooms
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-1');
      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-2');
      
      // Verify event listeners are set up
      expect(mockSocket.on).toHaveBeenCalledWith('join_conversation', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave_conversation', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('stop_typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('sendMessage', () => {
    it('should emit message to conversation room', () => {
      const conversationId = 'conv-123';
      const message = { id: 'msg-123', content: 'Hello' };
      
      socketService.sendMessage(conversationId, message);
      
      expect(mockIo.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('new_message', message);
    });
  });

  describe('sendNotification', () => {
    it('should emit notification to user room', () => {
      const userId = 'user-123';
      const notification = { id: 'notif-123', title: 'Test Notification' };
      
      socketService.sendNotification(userId, notification);
      
      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('notification', notification);
    });
  });

  describe('updateConversation', () => {
    it('should emit conversation update to conversation room', () => {
      const conversationId = 'conv-123';
      const update = { type: 'participant_added', participant: { id: 'user-456' } };
      
      socketService.updateConversation(conversationId, update);
      
      expect(mockIo.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('conversation_updated', update);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return list of online user IDs', () => {
      // Add some users to the map
      (socketService as any).userSockets.set('user-123', new Set(['socket-1']));
      (socketService as any).userSockets.set('user-456', new Set(['socket-2']));
      
      const onlineUsers = socketService.getOnlineUsers();
      
      expect(onlineUsers).toEqual(['user-123', 'user-456']);
    });
  });

  describe('isUserOnline', () => {
    it('should return true for online user', () => {
      (socketService as any).userSockets.set('user-123', new Set(['socket-1']));
      
      const isOnline = socketService.isUserOnline('user-123');
      
      expect(isOnline).toBe(true);
    });
    
    it('should return false for offline user', () => {
      const isOnline = socketService.isUserOnline('user-789');
      
      expect(isOnline).toBe(false);
    });
  });

  describe('getUserStatus', () => {
    it('should return online status for connected user', async () => {
      (socketService as any).userSockets.set('user-123', new Set(['socket-1']));
      
      const status = await socketService.getUserStatus('user-123');
      
      expect(status).toEqual({ isOnline: true });
    });
    
    it('should return offline status with last seen for disconnected user', async () => {
      const mockUser = {
        lastActive: new Date('2023-01-01T12:00:00Z'),
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      
      const status = await socketService.getUserStatus('user-789');
      
      expect(status).toEqual({ 
        isOnline: false, 
        lastSeen: '2023-01-01T12:00:00.000Z' 
      });
    });
  });

  describe('initializeSocket', () => {
    it('should create and return a singleton instance', () => {
      const instance1 = (SocketService as any).initializeSocket(mockHttpServer);
      const instance2 = (SocketService as any).initializeSocket(mockHttpServer);
      
      expect(instance1).toBe(instance2);
    });
  });
});