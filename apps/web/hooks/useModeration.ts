'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

export function useBlockUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => api.post(`/api/users/${userId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      addToast({ type: 'success', title: 'User blocked' });
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Failed to block user', message: error.response?.data?.error });
    },
  });
}

export function useReportMessage() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: string }) =>
      api.post(`/api/messages/${messageId}/report`, { reason }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Message reported', message: 'Thank you for your feedback.' });
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Failed to report message', message: error.response?.data?.error });
    },
  });
}