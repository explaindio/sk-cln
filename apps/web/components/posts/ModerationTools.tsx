'use client';

import { useState } from 'react';
import { Button } from '../../ui/Button';
import {
  Shield,
  Flag,
  Eye,
  EyeOff,
  AlertTriangle,
  Ban
} from 'lucide-react';

interface ModerationToolsProps {
  postId: string;
  isModerator: boolean;
  isHidden?: boolean;
  isFlagged?: boolean;
}

export function ModerationTools({
  postId,
  isModerator,
  isHidden = false,
  isFlagged = false
}: ModerationToolsProps) {
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [action, setAction] = useState<'hide' | 'flag' | 'ban' | null>(null);
  const [reason, setReason] = useState('');

  if (!isModerator) return null;

  const handleAction = async () => {
    // TODO: Implement moderation action
    console.log('Moderation action:', action, reason);
    setShowReasonModal(false);
    setReason('');
    setAction(null);
  };

  return (
    <>
      <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
        <Shield className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">
          Moderation Tools
        </span>

        <div className="flex-1 flex items-center justify-end space-x-2">
          <Button
            size="sm"
            variant={isHidden ? 'default' : 'outline'}
            onClick={() => {
              setAction('hide');
              setShowReasonModal(true);
            }}
          >
            {isHidden ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Unhide
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Hide
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant={isFlagged ? 'danger' : 'outline'}
            onClick={() => {
              setAction('flag');
              setShowReasonModal(true);
            }}
          >
            <Flag className="h-4 w-4 mr-1" />
            {isFlagged ? 'Unflag' : 'Flag'}
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setAction('ban');
              setShowReasonModal(true);
            }}
          >
            <Ban className="h-4 w-4 mr-1" />
            Ban User
          </Button>
        </div>
      </div>

      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
              Moderation Action
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for this moderation action:
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              rows={3}
            />

            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonModal(false);
                  setReason('');
                  setAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleAction}
                disabled={!reason.trim()}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}