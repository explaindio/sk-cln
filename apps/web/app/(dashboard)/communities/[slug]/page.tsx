'use client';

import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { usePosts } from '@/hooks/usePosts';
import { useCommunity } from '@/hooks/useCommunity';
import { usePostSearch } from '@/hooks/usePostSearch';
import { useAuthStore } from '@/store/authStore';
import { PostCard } from '@/components/posts/PostCard';
import { NewPostForm } from '@/components/posts/NewPostForm';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Card, CardContent } from '@/components/ui/Card';

interface CommunityPageProps {
  params: { slug: string };
}

export default function CommunityPostsPage({ params }: CommunityPageProps) {
   const user = useAuthStore((state) => state.user);
   const { data: community } = useCommunity(params.slug);
   const [showNewPost, setShowNewPost] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');

   const { data: searchResults, isLoading: isSearching } = usePostSearch(
     searchQuery,
     community?.id
   );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = usePosts(params.slug);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  const allPosts = data?.pages.flatMap((page) => page.posts) || [];
  const isOwner = community?.owner.id === user?.id;

  // Determine which posts to display
  const displayedPosts = searchQuery.length > 2 && searchResults?.posts
    ? searchResults.posts
    : allPosts;

  return (
    <div className="space-y-6">
      {/* Create post section */}
      {!showNewPost ? (
        <Card>
          <CardContent className="p-4">
            <button
              onClick={() => setShowNewPost(true)}
              className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              What's on your mind?
            </button>
          </CardContent>
        </Card>
      ) : (
        <NewPostForm
          communityId={community?.id || ''}
          onSuccess={() => setShowNewPost(false)}
          onCancel={() => setShowNewPost(false)}
        />
      )}

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loading size="sm" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts feed */}
      <div className="space-y-4">
        {searchQuery.length > 2 && searchResults?.posts?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No posts found</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search terms
              </p>
            </CardContent>
          </Card>
        ) : displayedPosts.length === 0 && searchQuery.length <= 2 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No posts yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Be the first to share something!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {displayedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                communitySlug={params.slug}
                isOwner={isOwner || post.author.id === user?.id}
              />
            ))}

            {hasNextPage && !searchQuery && (
              <div ref={ref} className="flex justify-center py-4">
                {isFetchingNextPage && <Loading size="sm" />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}