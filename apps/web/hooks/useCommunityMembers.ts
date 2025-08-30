import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface Member {
  id: string;
  userId: string;
  communityId: string;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export function useCommunityMembers(communitySlug: string) {
  return useQuery<Member[]>({
    queryKey: ['community-members', communitySlug],
    queryFn: async () => {
      const { data } = await api.get(`/api/communities/${communitySlug}/members`);
      return data;
    },
    enabled: !!communitySlug,
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (communitySlug: string) => {
      const response = await api.post(`/api/communities/${communitySlug}/join`);
      return response.data;
    },
    onSuccess: (_, communitySlug) => {
      queryClient.invalidateQueries({
        queryKey: ['community', communitySlug]
      });
      queryClient.invalidateQueries({
        queryKey: ['community-members', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Successfully joined community',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to join community',
        message: error.response?.data?.error,
      });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (communitySlug: string) => {
      const response = await api.delete(`/api/communities/${communitySlug}/leave`);
      return response.data;
    },
    onSuccess: (_, communitySlug) => {
      queryClient.invalidateQueries({
        queryKey: ['community', communitySlug]
      });
      queryClient.invalidateQueries({
        queryKey: ['community-members', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Left community',
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      communitySlug,
      memberId,
      role,
    }: {
      communitySlug: string;
      memberId: string;
      role: string;
    }) => {
      const response = await api.patch(
        `/api/communities/${communitySlug}/members/${memberId}`,
        { role }
      );
      return response.data;
    },
    onSuccess: (_, { communitySlug }) => {
      queryClient.invalidateQueries({
        queryKey: ['community-members', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Member role updated',
      });
    },
  });
}