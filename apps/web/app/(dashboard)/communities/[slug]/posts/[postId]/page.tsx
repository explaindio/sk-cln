'use client';

import { usePost } from '../../../../hooks/usePosts';
import { PostCard } from '../../../../components/posts/PostCard';
import { CommentsSection } from '../../../../components/posts/CommentsSection';
import { Loading } from '../../../../components/ui/Loading';
import { Button } from '../../../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PostDetailPageProps {
  params: {
    slug: string;
    postId: string;
  };
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const { data: post, isLoading, error } = usePost(params.postId);

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  if (error || !post) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Post not found</p>
        <Link href={`/communities/${params.slug}`}>
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/communities/${params.slug}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Community
      </Link>

      <div className="space-y-6">
        <PostCard
          post={post}
          communitySlug={params.slug}
          showActions={true}
        />

        <div className="bg-white rounded-lg p-6">
          <CommentsSection postId={params.postId} />
        </div>
      </div>
    </div>
  );
}