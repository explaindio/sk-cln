'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { formatDistanceToNow } from 'date-fns';
import {
  X,
  Users,
  Settings,
  Bell,
  BellOff,
  UserPlus,
  LogOut,
  Edit,
  Trash,
  ShieldAlert
} from 'lucide-react';
import Image from 'next/image';
import { MessageExport } from './MessageExport';
import { useBlockUser } from '../../hooks/useModeration';
import { useAuthStore } from '../../store/authStore';

interface ConversationInfoProps {
  conversation: any;
  onClose: () => void;
}

export function ConversationInfo({ conversation, onClose }: ConversationInfoProps) {
   const user = useAuthStore((state) => state.user);
   const [isEditingName, setIsEditingName] = useState(false);
   const [groupName, setGroupName] = useState(conversation.groupName || '');
   const [isMuted, setIsMuted] = useState(false);
   const blockUser = useBlockUser();

  const handleUpdateGroupName = async () => {
    // TODO: Implement group name update
    setIsEditingName(false);
  };

  const handleAddParticipant = () => {
    // TODO: Implement add participant
  };

  const handleLeaveGroup = () => {
    // TODO: Implement leave group
  };

  const handleDeleteConversation = () => {
    // TODO: Implement delete conversation
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold">Conversation Info</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Group Info */}
        {conversation.isGroup && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Group Name</h4>
              <button
                onClick={() => setIsEditingName(!isEditingName)}
                className="text-primary-600 hover:text-primary-700"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>

            {isEditingName ? (
              <div className="flex space-x-2">
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleUpdateGroupName}>
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-gray-700">{conversation.groupName || 'Unnamed Group'}</p>
            )}
          </div>
        )}

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Participants ({conversation.participants.length})
            </h4>
            {conversation.isGroup && (
              <button
                onClick={handleAddParticipant}
                className="text-primary-600 hover:text-primary-700"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {conversation.participants.map((participant: any) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Image
                    src={participant.avatar || '/default-avatar.png'}
                    alt={participant.username}
                    width={32}
                    height={32}
                    className="w-8 h-8 bg-gray-300 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{participant.username}</p>
                    {participant.isOnline ? (
                      <p className="text-xs text-green-600">Online</p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Last seen {participant.lastSeen ? formatDistanceToNow(new Date(participant.lastSeen), { addSuffix: true }) : 'recently'}
                      </p>
                    )}
                  </div>
                </div>
                {participant.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => blockUser.mutate(participant.id)}
                    disabled={blockUser.isPending}
                  >
                    <ShieldAlert className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </h4>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              {isMuted ? (
                <BellOff className="h-5 w-5 text-gray-500" />
              ) : (
                <Bell className="h-5 w-5 text-gray-500" />
              )}
              <span className="text-sm">
                {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
              </span>
            </div>
          </button>

          {conversation.isGroup && (
            <button
              onClick={handleLeaveGroup}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Leave Group</span>
            </button>
          )}

          <button
            onClick={handleDeleteConversation}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-red-600"
          >
            <Trash className="h-5 w-5" />
            <span className="text-sm">Delete Conversation</span>
          </button>
        </div>

        {/* Export Messages */}
        <MessageExport conversationId={conversation.id} />

        {/* Shared Media */}
        <div>
          <h4 className="font-medium mb-3">Shared Media</h4>
          <div className="grid grid-cols-3 gap-2">
            {/* Media grid would go here */}
            <div className="aspect-square bg-gray-200 rounded" />
            <div className="aspect-square bg-gray-200 rounded" />
            <div className="aspect-square bg-gray-200 rounded" />
          </div>
          <button className="text-sm text-primary-600 hover:underline mt-2">
            View All
          </button>
        </div>
      </div>
    </div>
  );
}