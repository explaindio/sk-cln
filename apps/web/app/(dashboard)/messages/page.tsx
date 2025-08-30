'use client';

import { useState } from 'react';
import { useConversation } from '@/hooks/useMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageThread } from '@/components/messages/MessageThread';
import { NewConversationModal } from '@/components/messages/NewConversationModal';
import { ConversationInfo } from '@/components/messages/ConversationInfo';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Bell } from 'lucide-react';

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { permission, requestPermission } = useNotifications();
  const { data: conversation } = useConversation(selectedConversationId || '');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
      {/* Notification Permission Banner */}
      {permission !== 'granted' && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Enable notifications to get notified of new messages
              </span>
            </div>
            <Button
              onClick={requestPermission}
              size="sm"
              variant="outline"
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              Enable Notifications
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Conversation List */}
        <div className="w-full md:w-80 flex-shrink-0 border-r border-gray-200">
        <ConversationList
          selectedId={selectedConversationId || undefined}
          onSelect={setSelectedConversationId}
          onNewConversation={() => setShowNewConversation(true)}
        />
      </div>

      {/* Message Thread */}
      <div className="flex-1 hidden md:flex flex-col">
        {selectedConversationId && conversation ? (
          <>
            <div className="flex-1 flex">
              <MessageThread
                conversationId={selectedConversationId}
                conversation={conversation}
              />

              {/* Conversation Info Sidebar */}
              {showInfo && (
                <div className="w-80 border-l border-gray-200">
                  <ConversationInfo
                    conversation={conversation}
                    onClose={() => setShowInfo(false)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                Select a conversation
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <NewConversationModal
            onClose={() => setShowNewConversation(false)}
            onCreated={(conversationId) => {
              setSelectedConversationId(conversationId);
              setShowNewConversation(false);
            }}
          />
        )}
      </div>
    </div>
  );
}