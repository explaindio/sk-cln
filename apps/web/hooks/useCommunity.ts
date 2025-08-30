import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: 'PUBLIC' | 'PRIVATE' | 'PAID';
  memberCount: number;
  createdAt: string;
  owner: {
    id: string;
    username: string;
  };
}

export function useCommunities() {
  return useQuery<Community[]>({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data } = await api.get('/api/communities');
      return data;
    },
  });
}

export function useCommunity(slug: string) {
  return useQuery<Community>({
    queryKey: ['community', slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/communities/${slug}`);
      return data;
    },
    enabled: !!slug,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      type: string;
    }) => {
      const response = await api.post('/api/communities', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      addToast({
        type: 'success',
        title: 'Community created successfully',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to create community',
        message: error.response?.data?.error,
      });
    },
  });
}