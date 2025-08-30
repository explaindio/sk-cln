import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../lib/toast';
import { AchievementToast } from '../../components/gamification/AchievementToast';

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { accessToken, isAuthenticated } = useAuthStore();
  const { addToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    // Initialize socket connection
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // User status events
    socket.on('user_status', ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (isOnline) {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    // Typing indicator events
    socket.on('user_typing', ({ userId, conversationId, isTyping }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (!updated[conversationId]) {
          updated[conversationId] = [];
        }

        if (isTyping) {
          if (!updated[conversationId].includes(userId)) {
            updated[conversationId].push(userId);
          }
        } else {
          updated[conversationId] = updated[conversationId].filter(
            (id) => id !== userId
          );
        }

        return updated;
      });
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [isAuthenticated, accessToken]);

  const joinConversation = useCallback((conversationId: string) => {
    socket?.emit('join_conversation', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socket?.emit('leave_conversation', conversationId);
  }, []);

  const sendTypingIndicator = useCallback(
    (conversationId: string, isTyping: boolean) => {
      socket?.emit('typing', { conversationId, isTyping });
    },
    []
  );

  const onNewMessage = useCallback((callback: (message: any) => void, showNotification?: (title: string, options?: NotificationOptions) => void) => {
    const handleNewMessage = (message: any) => {
      // Call the original callback
      callback(message);

      // Show notification if provided and window is not focused
      if (showNotification && typeof document !== 'undefined' && !document.hasFocus()) {
        const senderName = message.sender?.name || 'Someone';
        const content = message.content?.length > 50
          ? message.content.substring(0, 50) + '...'
          : message.content;

        showNotification('New Message', {
          body: `${senderName}: ${content}`,
          icon: '/favicon.ico',
          tag: `message-${message.conversationId}`,
        });
      }
    };

    socket?.on('new_message', handleNewMessage);
    return () => {
      socket?.off('new_message', handleNewMessage);
    };
  }, []);

  const onConversationUpdate = useCallback(
    (callback: (update: any) => void) => {
      socket?.on('conversation_updated', callback);
      return () => {
        socket?.off('conversation_updated', callback);
      };
    },
    []
  );

  const onNotification = useCallback((callback: (notification: any) => void) => {
    const handleNotification = (notification: any) => {
      // Handle achievement notifications specially
      if (notification.type === 'ACHIEVEMENT_UNLOCKED') {
        addToast({
          type: 'success',
          duration: 8000, // Show longer for achievements
          title: notification.title,
          message: notification.message,
          component: (
            <AchievementToast
              title={notification.title}
              message={notification.message}
              icon={notification.data?.icon}
              points={notification.data?.points}
            />
          ),
        });
      }

      // Call the original callback for other notification types
      callback(notification);
    };

    socket?.on('notification', handleNotification);
    return () => {
      socket?.off('notification', handleNotification);
    };
  }, [addToast]);

  return {
    isConnected,
    socket,
    joinConversation,
    leaveConversation,
    sendTypingIndicator,
    onNewMessage,
    onConversationUpdate,
    onNotification,
    typingUsers,
    onlineUsers,
  };
}