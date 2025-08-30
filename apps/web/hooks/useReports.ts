import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

export function useReportPost() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      postId,
      reason,
      details,
    }: {
      postId: string;
      reason: string;
      details?: string;
    }) => {
      const response = await api.post(`/api/posts/${postId}/report`, {
        reason,
        details,
      });
      return response.data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Report submitted',
        message: 'Thank you for helping keep our community safe',
      });
    },
  });
}

export function useReportComment() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      reason,
      details,
    }: {
      commentId: string;
      reason: string;
      details?: string;
    }) => {
      const response = await api.post(`/api/comments/${commentId}/report`, {
        reason,
        details,
      });
      return response.data;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Report submitted',
        message: 'Thank you for helping keep our community safe',
      });
    },
  });
}