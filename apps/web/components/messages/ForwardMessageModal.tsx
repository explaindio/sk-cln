'use client';

import { useState } from 'react';
import { useConversations, useSendMessage } from '../../../hooks/useMessages';
import { Button } from '../../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { X, Send } from 'lucide-react';

interface ForwardMessageModalProps {
  messageToForward: any;
  onClose: () => void;
}

export function ForwardMessageModal({ messageToForward, onClose }: ForwardMessageModalProps) {
  const { data: conversations } = useConversations();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const sendMessage = useSendMessage();

  const handleForward = async () => {
    for (const id of selectedIds) {
      await sendMessage.mutateAsync({
        conversationId: id,
        content: `Forwarded: ${messageToForward.content}`,
        // In a real app, you'd handle attachments and other types
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Forward Message</CardTitle>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto mb-4">
            {conversations?.map((conv) => (
              <div key={conv.id} className="flex items-center p-2 rounded-lg hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(conv.id)}
                  onChange={() => {
                    setSelectedIds(
                      selectedIds.includes(conv.id)
                        ? selectedIds.filter((id) => id !== conv.id)
                        : [...selectedIds, conv.id]
                    );
                  }}
                  className="mr-3"
                />
                <span>{conv.isGroup ? conv.groupName : conv.participants[0].username}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleForward} disabled={selectedIds.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}