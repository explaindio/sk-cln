import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface Invite {
  id: string;
  code: string;
  communityId: string;
  createdBy: string;
  expiresAt: string | null;
  uses: number;
  maxUses: number | null;
}

export function useCommunityInvites(communitySlug: string) {
  return useQuery<Invite[]>({
    queryKey: ['community-invites', communitySlug],
    queryFn: async () => {
      const { data } = await api.get(`/api/communities/${communitySlug}/invites`);
      return data;
    },
    enabled: !!communitySlug,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      communitySlug,
      maxUses,
      expiresIn,
    }: {
      communitySlug: string;
      maxUses?: number;
      expiresIn?: number; // hours
    }) => {
      const response = await api.post(
        `/api/communities/${communitySlug}/invites`,
        { maxUses, expiresIn }
      );
      return response.data;
    },
    onSuccess: (data, { communitySlug }) => {
      queryClient.invalidateQueries({
        queryKey: ['community-invites', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Invite created',
        message: `Invite code: ${data.code}`,
      });
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      communitySlug,
      inviteId,
    }: {
      communitySlug: string;
      inviteId: string;
    }) => {
      await api.delete(`/api/communities/${communitySlug}/invites/${inviteId}`);
    },
    onSuccess: (_, { communitySlug }) => {
      queryClient.invalidateQueries({
        queryKey: ['community-invites', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Invite deleted',
      });
    },
  });
}

export function useJoinByInvite() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const response = await api.post('/api/communities/join', { inviteCode });
      return response.data;
    },
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Joined community',
        message: `Welcome to ${data.community.name}!`,
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Invalid invite',
        message: error.response?.data?.error,
      });
    },
  });
}