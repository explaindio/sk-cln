import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { encryptMessage, decryptMessage } from '../lib/encryption';

interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  attachments?: Attachment[];
  readBy: string[];
  editedAt?: string;
  deletedAt?: string;
  replyTo?: Message;
  reactions?: Reaction[];
  createdAt: string;
}

interface Attachment {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface User {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/api/messages/conversations');
      return data;
    },
  });
}

export function useConversation(conversationId: string) {
  return useQuery<Conversation>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/api/messages/conversations/${conversationId}`);
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery<{ messages: Message[]; nextCursor?: string }>({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);

      const { data } = await api.get(
        `/api/messages/conversations/${conversationId}/messages?${params}`
      );

      // Decrypt messages
      const decryptedMessages = data.messages.map((msg: Message) => ({
        ...msg,
        content: decryptMessage(msg.content, conversationId),
      }));

      return { ...data, messages: decryptedMessages };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      type = 'TEXT',
      attachments,
      replyToId,
    }: {
      conversationId: string;
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE';
      attachments?: string[];
      replyToId?: string;
    }) => {
      const encryptedContent = encryptMessage(content, conversationId);
      const response = await api.post(
        `/api/messages/conversations/${conversationId}/messages`,
        { content: encryptedContent, type, attachments, replyToId }
      );
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to send message',
        message: error.response?.data?.error,
      });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      participantIds,
      isGroup,
      groupName,
    }: {
      participantIds: string[];
      isGroup?: boolean;
      groupName?: string;
    }) => {
      const response = await api.post('/api/messages/conversations', {
        participantIds,
        isGroup,
        groupName,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      addToast({
        type: 'success',
        title: 'Conversation created',
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageIds,
    }: {
      conversationId: string;
      messageIds: string[];
    }) => {
      await api.post(
        `/api/messages/conversations/${conversationId}/read`,
        { messageIds }
      );
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useTypingIndicator() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      isTyping,
    }: {
      conversationId: string;
      isTyping: boolean;
    }) => {
      await api.post(
        `/api/messages/conversations/${conversationId}/typing`,
        { isTyping }
      );
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const response = await api.post(`/api/messages/${messageId}/reactions`, { emoji });
      return response.data;
    },
    onSuccess: (_, { messageId }) => {
      // Optimistically update or just refetch
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to add reaction',
        message: error.response?.data?.error,
      });
    },
  });
}

export function useSearchMessages(conversationId: string, query: string) {
  return useQuery<Message[]>({
    queryKey: ['messages', conversationId, 'search', query],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/messages/conversations/${conversationId}/search?q=${query}`
      );

      // Decrypt messages for search results
      const decryptedMessages = data.map((msg: Message) => ({
        ...msg,
        content: decryptMessage(msg.content, conversationId),
      }));

      return decryptedMessages;
    },
    enabled: !!query && query.length > 2,
  });
}

export function useExportMessages() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      conversationId,
      format,
    }: {
      conversationId: string;
      format: 'json' | 'csv';
    }) => {
      const response = await api.get(
        `/api/messages/conversations/${conversationId}/export?format=${format}`,
        { responseType: 'blob' } // Important for file downloads
      );
      return { data: response.data, format };
    },
    onSuccess: ({ data, format }, { conversationId }) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `conversation-${conversationId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      addToast({
        type: 'success',
        title: 'Export started',
        message: 'Your message history is being downloaded.',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Export failed',
        message: error.response?.data?.error || 'Could not export messages.',
      });
    },
  });
}
export function useTogglePinMessage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (messageId: string) => api.post(`/api/messages/${messageId}/pin`),
    onSuccess: (_, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] }); // To update pinned messages list
      addToast({ type: 'success', title: 'Message pin updated' });
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Failed to update pin', message: error.response?.data?.error });
    },
  });
}