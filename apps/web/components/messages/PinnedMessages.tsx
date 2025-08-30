'use client';

import { Pin, X } from 'lucide-react';

interface PinnedMessagesProps {
  pinnedMessages: any[];
  onUnpin: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
}

export function PinnedMessages({ pinnedMessages, onUnpin, onJumpTo }: PinnedMessagesProps) {
  if (pinnedMessages.length === 0) return null;

  return (
    <div className="p-2 bg-yellow-50 border-b border-yellow-200">
      {pinnedMessages.map((msg) => (
        <div key={msg.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center truncate">
            <Pin className="h-4 w-4 mr-2 text-yellow-600" />
            <span className="truncate cursor-pointer" onClick={() => onJumpTo(msg.id)}>
              {msg.content}
            </span>
          </div>
          <button onClick={() => onUnpin(msg.id)} className="p-1">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ))}
    </div>
  );
}