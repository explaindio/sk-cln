import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface Post {
  id: string;
  title?: string;
  content: string;
  authorId: string;
  communityId: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  tags: string[];
  userLiked?: boolean;
}

export function usePosts(communitySlug: string) {
  return useInfiniteQuery<{ posts: Post[]; nextCursor?: string }>({
    queryKey: ['posts', communitySlug],
    queryFn: async ({ pageParam = undefined }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);

      const { data } = await api.get(
        `/api/communities/${communitySlug}/posts?${params}`
      );
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}

export function usePost(postId: string) {
  return useQuery<Post>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data } = await api.get(`/api/posts/${postId}`);
      return data;
    },
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      communityId: string;
      title?: string;
      content: string;
      tags?: string[];
    }) => {
      const response = await api.post('/api/posts', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['posts', variables.communityId]
      });
      addToast({
        type: 'success',
        title: 'Post created successfully',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to create post',
        message: error.response?.data?.error,
      });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      data,
    }: {
      postId: string;
      data: { title?: string; content: string; tags?: string[] };
    }) => {
      const response = await api.patch(`/api/posts/${postId}`, data);
      return response.data;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      addToast({
        type: 'success',
        title: 'Post updated',
      });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/api/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      addToast({
        type: 'success',
        title: 'Post deleted',
      });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/api/posts/${postId}/like`);
      return response.data;
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/api/posts/${postId}/like`);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}