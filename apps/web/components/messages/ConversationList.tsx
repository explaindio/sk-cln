'use client';

import { useState } from 'react';
import { useConversations } from '../../hooks/useMessages';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  Circle
} from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '../../store/authStore';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function ConversationList({
  selectedId,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();
  const { onlineUsers } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const currentUser = useAuthStore((state) => state.user);

  const filteredConversations = conversations?.filter((conv) => {
    const searchLower = searchTerm.toLowerCase();
    if (conv.isGroup) {
      return conv.groupName?.toLowerCase().includes(searchLower);
    }
    return conv.participants.some((p) =>
      p.username.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <Loading size="md" className="p-4" />;
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations?.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start a new conversation to connect
            </p>
          </div>
        ) : (
          <div>
            {filteredConversations?.map((conversation) => {
              const otherParticipant = conversation.participants.find(
                (p) => p.id !== currentUser?.id
              );
              const displayName = conversation.isGroup
                ? conversation.groupName
                : otherParticipant?.username;
              const displayAvatar = conversation.isGroup
                ? conversation.groupAvatar
                : otherParticipant?.avatar;
              const isOnline = otherParticipant
                ? onlineUsers.has(otherParticipant.id)
                : false;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={`w-full p-3 flex items-start space-x-3 hover:bg-gray-50 transition-colors ${
                    selectedId === conversation.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="relative">
                    {displayAvatar ? (
                      <Image
                        src={displayAvatar}
                        alt={displayName || ''}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        {conversation.isGroup ? (
                          <Users className="h-5 w-5 text-gray-600" />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {displayName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    {!conversation.isGroup && isOnline && (
                      <Circle className="absolute bottom-0 right-0 h-3 w-3 text-green-500 fill-current border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{displayName}</p>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDistanceToNow(
                            new Date(conversation.lastMessageAt),
                            { addSuffix: true }
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage.content}
                        </p>
                      )}

                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-primary-600 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}