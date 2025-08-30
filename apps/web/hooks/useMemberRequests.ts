import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface MemberRequest {
  id: string;
  userId: string;
  communityId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export function useMemberRequests(communitySlug: string) {
  return useQuery<MemberRequest[]>({
    queryKey: ['member-requests', communitySlug],
    queryFn: async () => {
      const { data } = await api.get(`/api/communities/${communitySlug}/requests`);
      return data;
    },
    enabled: !!communitySlug,
  });
}

export function useApproveMemberRequest() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      communitySlug,
      requestId,
    }: {
      communitySlug: string;
      requestId: string;
    }) => {
      const response = await api.post(
        `/api/communities/${communitySlug}/requests/${requestId}/approve`
      );
      return response.data;
    },
    onSuccess: (_, { communitySlug }) => {
      queryClient.invalidateQueries({
        queryKey: ['member-requests', communitySlug]
      });
      queryClient.invalidateQueries({
        queryKey: ['community-members', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Request approved',
      });
    },
  });
}

export function useRejectMemberRequest() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      communitySlug,
      requestId,
    }: {
      communitySlug: string;
      requestId: string;
    }) => {
      const response = await api.post(
        `/api/communities/${communitySlug}/requests/${requestId}/reject`
      );
      return response.data;
    },
    onSuccess: (_, { communitySlug }) => {
      queryClient.invalidateQueries({
        queryKey: ['member-requests', communitySlug]
      });
      addToast({
        type: 'success',
        title: 'Request rejected',
      });
    },
  });
}