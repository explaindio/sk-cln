'use client';

import { useState } from 'react';
import { useComments, useCreateComment } from '../../hooks/useComments';
import { Comment } from './Comment';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';
import { MessageSquare } from 'lucide-react';

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const [showNewComment, setShowNewComment] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');

  const { data: comments, isLoading } = useComments(postId);
  const createComment = useCreateComment();

  const handleCreateComment = async () => {
    if (!newCommentContent.trim()) return;

    await createComment.mutateAsync({
      postId,
      content: newCommentContent,
    });

    setNewCommentContent('');
    setShowNewComment(false);
  };

  // Build comment tree
  const commentTree = comments?.reduce((tree, comment) => {
    if (!comment.parentId) {
      tree.push(comment);
    } else {
      const parent = comments.find((c) => c.id === comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      }
    }
    return tree;
  }, [] as any[]) || [];

  if (isLoading) {
    return <Loading size="md" className="my-8" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Comments ({comments?.length || 0})
        </h3>
      </div>

      {!showNewComment ? (
        <button
          onClick={() => setShowNewComment(true)}
          className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          Add a comment...
        </button>
      ) : (
        <div className="space-y-3">
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleCreateComment}
              isLoading={createComment.isPending}
              disabled={!newCommentContent.trim()}
            >
              Comment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewComment(false);
                setNewCommentContent('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {commentTree.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            postId={postId}
          />
        ))}
      </div>
    </div>
  );
}