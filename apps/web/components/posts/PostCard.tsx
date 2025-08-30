'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { useLikePost, useUnlikePost } from '@/hooks/usePosts';
import { getCDNUrl } from '@/lib/utils';
import {
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  Edit,
  Trash,
  Pin
} from 'lucide-react';

interface PostCardProps {
  post: {
    id: string;
    title?: string;
    content: string;
    author: {
      id: string;
      username: string;
      avatar?: string;
    };
    createdAt: string;
    likeCount: number;
    commentCount: number;
    userLiked?: boolean;
    isPinned?: boolean;
    tags?: string[];
  };
  communitySlug: string;
  showActions?: boolean;
  isOwner?: boolean;
}

export function PostCard({
  post,
  communitySlug,
  showActions = true,
  isOwner = false
}: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();

  const handleLike = async () => {
    if (post.userLiked) {
      await unlikePost.mutateAsync(post.id);
    } else {
      await likePost.mutateAsync(post.id);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {post.author.avatar ? (
              <Image
                src={getCDNUrl(post.author.avatar)}
                alt={post.author.username}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Link
                  href={`/profile/${post.author.username}`}
                  className="font-medium hover:underline"
                >
                  {post.author.username}
                </Link>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
                {post.isPinned && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </span>
                )}
              </div>

              {post.title && (
                <h3 className="text-lg font-semibold mt-2">{post.title}</h3>
              )}

              <div className="mt-2">
                <RichTextEditor content={post.content} editable={false} />
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {showActions && (
                <div className="mt-4 flex items-center space-x-6">
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 transition-colors ${
                      post.userLiked
                        ? 'text-red-600'
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${post.userLiked ? 'fill-current' : ''}`}
                    />
                    <span className="text-sm">{post.likeCount}</span>
                  </button>

                  <Link
                    href={`/communities/${communitySlug}/posts/${post.id}`}
                    className="flex items-center space-x-2 text-gray-500 hover:text-primary-600"
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm">{post.commentCount}</span>
                  </Link>

                  <button className="flex items-center space-x-2 text-gray-500 hover:text-primary-600">
                    <Share2 className="h-5 w-5" />
                    <span className="text-sm">Share</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Pin className="h-4 w-4 mr-2" />
                      {post.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}