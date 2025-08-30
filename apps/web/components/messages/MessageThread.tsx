'use client';

import { useState, useEffect, useRef } from 'react';
import { useMessages, useSendMessage, useMarkAsRead, useToggleReaction, useSearchMessages, useTogglePinMessage } from '../../../hooks/useMessages';
import { useSocket } from '../../../hooks/useSocket';
import { useNotifications } from '../../../hooks/useNotifications';
import { useUpload } from '../../../hooks/useUpload';
import { useReportMessage } from '../../../hooks/useModeration';
import { useAuthStore } from '../../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../../ui/Button';
import { Loading } from '../../ui/Loading';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/Popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
    Send,
    Paperclip,
    Smile,
    MoreVertical,
    Check,
    CheckCheck,
    Reply,
    Edit,
    Trash,
    X,
    Search,
    Phone,
    Video as VideoIcon,
    ShieldAlert,
    Forward,
    Pin
  } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import Image from 'next/image';
import { CallView } from './CallView';
import { ForwardMessageModal } from './ForwardMessageModal';
import { PinnedMessages } from './PinnedMessages';

interface MessageThreadProps {
  conversationId: string;
  conversation: any;
}

export function MessageThread({ conversationId, conversation }: MessageThreadProps) {
   const user = useAuthStore((state) => state.user);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [message, setMessage] = useState('');
   const [isTyping, setIsTyping] = useState(false);
   const [replyingTo, setReplyingTo] = useState<any>(null);
   const [forwardingMessage, setForwardingMessage] = useState<any>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const [isSearching, setIsSearching] = useState(false);
   const [inCall, setInCall] = useState(false);
   const [isReceivingCall, setIsReceivingCall] = useState(false); // This would be triggered by a socket event

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useMessages(conversationId);

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const toggleReaction = useToggleReaction();
  const togglePin = useTogglePinMessage();
  const upload = useUpload();
  const reportMessage = useReportMessage();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchMessages(
    conversationId,
    searchQuery
  );
  const {
    sendTypingIndicator,
    typingUsers,
    onNewMessage,
    onlineUsers
  } = useSocket();

  const { showNotification } = useNotifications();

  const { ref: loadMoreRef, inView } = useInView();

  // Auto-load more messages when scrolling up
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle new messages via WebSocket
  useEffect(() => {
    const unsubscribe = onNewMessage((newMessage) => {
      if (newMessage.conversationId === conversationId) {
        // Invalidate query to refetch messages
        // This is handled by the query invalidation in the useSendMessage mutation
      }
    }, showNotification);

    return unsubscribe;
  }, [conversationId, onNewMessage, showNotification]);

  // Mark messages as read
  useEffect(() => {
    if (data?.pages) {
      const unreadMessages = data.pages
        .flatMap((page) => page.messages)
        .filter((msg) => !msg.readBy.includes(user?.id || ''))
        .map((msg) => msg.id);

      if (unreadMessages.length > 0) {
        markAsRead.mutate({ conversationId, messageIds: unreadMessages });
      }
    }
  }, [data, conversationId, user?.id, markAsRead]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [data]);

  // Handle typing indicator
  useEffect(() => {
    let typingTimer: NodeJS.Timeout;

    if (isTyping) {
      sendTypingIndicator(conversationId, true);
      typingTimer = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(conversationId, false);
      }, 3000);
    }

    return () => clearTimeout(typingTimer);
  }, [isTyping, conversationId, sendTypingIndicator]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    await sendMessage.mutateAsync({
      conversationId,
      content: message,
      replyToId: replyingTo?.id,
    });

    setMessage('');
    setReplyingTo(null);
    setIsTyping(false);
    sendTypingIndicator(conversationId, false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData, messageId: string) => {
    toggleReaction.mutate({ messageId, emoji: emojiData.emoji });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedFile = await upload.uploadWithPresignedUrl(file);

      // Send a message with the attachment
      await sendMessage.mutateAsync({
        conversationId,
        content: file.name,
        type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
        attachments: [uploadedFile.key],
      });

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleReport = (messageId: string) => {
    const reason = prompt('Please provide a reason for reporting this message:');
    if (reason) {
      reportMessage.mutate({ messageId, reason });
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    // Logic to scroll to the message in the thread
    const element = document.getElementById(`message-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return <Loading size="lg" className="flex-1" />;
  }

  const allMessages = data?.pages.flatMap((page) => page.messages).reverse() || [];
  const typingUsersInConversation = typingUsers[conversationId]?.filter(id => id !== user?.id) || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{conversation.isGroup ? conversation.groupName : conversation.participants.find(p => p.id !== user?.id)?.username}</h3>
          <p className="text-xs text-gray-500">{onlineUsers.has(conversation.participants.find(p => p.id !== user?.id)?.id) ? 'Online' : 'Offline'}</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setInCall(true)} className="p-2">
            <Phone className="h-5 w-5 text-gray-500" />
          </button>
          <button onClick={() => setInCall(true)} className="p-2">
            <VideoIcon className="h-5 w-5 text-gray-500" />
          </button>
          <button onClick={() => setIsSearching(!isSearching)} className="p-2">
            <Search className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {isSearching && (
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search in conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      <PinnedMessages
        pinnedMessages={conversation.pinnedMessages || []}
        onUnpin={(id) => togglePin.mutate(id)}
        onJumpTo={handleJumpToMessage}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isSearching && searchQuery && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              Search results for "{searchQuery}"
            </h4>
            {isSearchLoading ? (
              <Loading size="sm" />
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((msg) => {
                  const sender = conversation.participants.find(
                    (p: any) => p.id === msg.senderId
                  );
                  return (
                    <div
                      key={msg.id}
                      className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium">{sender?.username}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No messages found</p>
            )}
          </div>
        )}

        {!isSearching && hasNextPage && (
          <div ref={loadMoreRef} className="text-center py-2">
            {isFetchingNextPage ? (
              <Loading size="sm" />
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="text-sm text-primary-600 hover:underline"
              >
                Load more messages
              </button>
            )}
          </div>
        )}

        {!isSearching && allMessages.map((msg) => {
          const isOwn = msg.senderId === user?.id;
          const sender = conversation.participants.find(
            (p: any) => p.id === msg.senderId
          );

          return (
            <div
              id={`message-${msg.id}`}
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end space-x-2 max-w-lg ${
                isOwn ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                {!isOwn && (
                  <Image
                    src={sender?.avatar || '/default-avatar.png'}
                    alt={sender?.username || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"
                  />
                )}

                <div>
                  {!isOwn && (
                    <p className="text-xs text-gray-500 mb-1 ml-2">
                      {sender?.username}
                    </p>
                  )}

                  {msg.replyTo && (
                    <div className="text-xs text-gray-500 bg-gray-100 rounded p-2 mb-1">
                      <Reply className="h-3 w-3 inline mr-1" />
                      {msg.replyTo.content}
                    </div>
                  )}

                  <div className={`relative group rounded-lg px-4 py-2 ${
                    isOwn
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{msg.content}</p>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((attachment) => (
                          <div key={attachment.id}>
                            {msg.type === 'IMAGE' ? (
                              <Image
                                src={attachment.url}
                                alt={attachment.name}
                                width={200}
                                height={200}
                                className="rounded-lg max-w-full h-auto"
                              />
                            ) : (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 text-sm p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Paperclip className="h-4 w-4" />
                                <span>{attachment.name}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reactions Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex space-x-1 mt-1">
                        {msg.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            className="px-2 py-0.5 bg-gray-200 text-xs rounded-full"
                          >
                            {reaction.emoji} {reaction.users.length}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Emoji Picker Trigger */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="absolute top-0 right-0 -mt-2 -mr-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
                          <Smile className="h-4 w-4 text-gray-500" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <EmojiPicker onEmojiClick={(emojiData) => onEmojiClick(emojiData, msg.id)} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center space-x-2 mt-1 px-2">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(msg.createdAt), {
                        addSuffix: false,
                      })}
                    </span>

                    {isOwn && (
                      <span className="text-xs text-gray-500">
                        {msg.readBy.length > 1 ? (
                          <CheckCheck className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </span>
                    )}

                    <button
                      onClick={() => togglePin.mutate(msg.id)}
                      className="text-xs text-gray-500 hover:text-yellow-600"
                    >
                      <Pin className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Reply className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => setForwardingMessage(msg)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      <Forward className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => handleReport(msg.id)}
                      className="text-xs text-gray-500 hover:text-red-600"
                      disabled={reportMessage.isPending}
                    >
                      <ShieldAlert className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!isSearching && typingUsersInConversation.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce" style={{animationDelay: '200ms'}}>•</span>
              <span className="animate-bounce" style={{animationDelay: '400ms'}}>•</span>
            </div>
            <span>
              {typingUsersInConversation.map((userId) => {
                const typingUser = conversation.participants.find(
                  (p: any) => p.id === userId
                );
                return typingUser?.username;
              }).join(', ')} {typingUsersInConversation.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        {!isSearching && <div ref={messagesEndRef} />}
      </div>

      {/* Reply indicator */}
      {!isSearching && replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <Reply className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-gray-600">
                Replying to {conversation.participants.find((p:any) => p.id === replyingTo.senderId)?.username}
              </p>
              <p className="text-gray-500 truncate">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      {!isSearching && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAttachmentClick}
              disabled={upload.uploading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <textarea
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={1}
            />

            <Button variant="ghost" size="icon">
              <Smile className="h-5 w-5" />
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              isLoading={sendMessage.isPending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Call Views */}
      {inCall && <CallView onEndCall={() => setInCall(false)} />}
      {isReceivingCall && (
        <CallView
          isReceivingCall
          onAcceptCall={() => {
            setIsReceivingCall(false);
            setInCall(true);
          }}
          onDeclineCall={() => setIsReceivingCall(false)}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          messageToForward={forwardingMessage}
          onClose={() => setForwardingMessage(null)}
        />
      )}
    </div>
  );
}