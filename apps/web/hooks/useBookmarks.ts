import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

export function useBookmarks() {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const { data } = await api.get('/api/bookmarks');
      return data;
    },
  });
}

export function useBookmarkPost() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/api/posts/${postId}/bookmark`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      addToast({
        type: 'success',
        title: 'Post bookmarked',
      });
    },
  });
}