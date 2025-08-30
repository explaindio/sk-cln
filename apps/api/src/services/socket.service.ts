import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export class SocketService {
  private io: SocketServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true,
      },
    });

    this.initialize();
  }

  private initialize() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const payload = verifyAccessToken(token);
        socket.data.userId = payload.userId;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket) {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Track user's socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Update last active time in database
    prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() },
    }).catch(error => {
      console.error('Failed to update user last active time:', error);
    });

    // Join user's room
    socket.join(`user:${userId}`);

    // Join conversation rooms
    this.joinUserConversations(socket, userId);

    // Handle events
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId, isTyping, messageId }: any) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        conversationId,
        isTyping,
        messageId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('stop_typing', ({ conversationId, messageId }: any) => {
      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId,
        messageId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected from socket ${socket.id}`);

      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // Update last active time in database
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { lastActive: new Date() },
            });
          } catch (error) {
            console.error('Failed to update user last active time:', error);
          }
          
          this.io.emit('user_status', { userId, isOnline: false, lastSeen: new Date().toISOString() });
        }
      }
    });

    this.io.emit('user_status', { userId, isOnline: true });
  }

  private async joinUserConversations(socket: Socket, userId: string) {
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    conversations.forEach((conv) => {
      socket.join(`conversation:${conv.conversationId}`);
    });
  }

  sendMessage(conversationId: string, message: any) {
    this.io.to(`conversation:${conversationId}`).emit('new_message', message);
  }

  sendNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  updateConversation(conversationId: string, update: any) {
    this.io.to(`conversation:${conversationId}`).emit('conversation_updated', update);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  async getUserStatus(userId: string): Promise<{ isOnline: boolean; lastSeen?: string }> {
    const isOnline = this.userSockets.has(userId);
    if (isOnline) {
      return { isOnline: true };
    }
    
    // For offline users, get lastSeen from the database
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastActive: true },
      });
      
      return {
        isOnline: false,
        lastSeen: user?.lastActive ? user.lastActive.toISOString() : undefined
      };
    } catch (error) {
      console.error('Failed to get user status:', error);
      return { isOnline: false, lastSeen: new Date().toISOString() };
    }
  }
}

export let socketService: SocketService;

export function initializeSocket(server: HttpServer) {
  if (!socketService) {
    socketService = new SocketService(server);
  }
  return socketService;
}