'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useCreateComment, useLikeComment, useDeleteComment } from '../../hooks/useComments';
import { Button } from '../ui/Button';
import { Heart, MessageSquare, MoreVertical, Trash, Edit } from 'lucide-react';
import { getCDNUrl } from '@/lib/utils';

interface CommentProps {
  comment: {
    id: string;
    content: string;
    author: {
      id: string;
      username: string;
      avatar?: string;
    };
    createdAt: string;
    likeCount: number;
    userLiked?: boolean;
    replies?: any[];
  };
  postId: string;
  level?: number;
}

export function Comment({ comment, postId, level = 0 }: CommentProps) {
  const user = useAuthStore((state) => state.user);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const createComment = useCreateComment();
  const likeComment = useLikeComment();
  const deleteComment = useDeleteComment();

  const isOwner = user?.id === comment.author.id;
  const canReply = level < 2; // Max 2 levels of nesting

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    await createComment.mutateAsync({
      postId,
      content: replyContent,
      parentId: comment.id,
    });

    setReplyContent('');
    setShowReplyForm(false);
  };

  const handleLike = async () => {
    await likeComment.mutateAsync(comment.id);
  };

  const handleDelete = async () => {
    await deleteComment.mutateAsync(comment.id);
  };

  return (
    <div className={`${level > 0 ? 'ml-12' : ''}`}>
      <div className="flex items-start space-x-3">
        {comment.author.avatar ? (
          <Image
            src={getCDNUrl(comment.author.avatar)}
            alt={comment.author.username}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{comment.author.username}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-700">{comment.content}</p>

          <div className="mt-2 flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 text-xs ${
                comment.userLiked
                  ? 'text-red-600'
                  : 'text-gray-500 hover:text-red-600'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${comment.userLiked ? 'fill-current' : ''}`}
              />
              <span>{comment.likeCount}</span>
            </button>

            {canReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-primary-600"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Reply</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative text-gray-500 hover:text-gray-700"
              >
                <MoreVertical className="h-4 w-4" />

                {showMenu && (
                  <div className="absolute left-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button className="flex items-center w-full px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center w-full px-3 py-1 text-xs text-red-600 hover:bg-gray-100"
                      >
                        <Trash className="h-3 w-3 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </button>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none"
                rows={2}
              />
              <div className="mt-2 flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  isLoading={createComment.isPending}
                >
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}