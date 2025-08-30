import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface EventReminder {
  id: string;
  eventId: string;
  type: 'EMAIL' | 'PUSH' | 'SMS';
  scheduledFor: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  recipients: number;
  message?: string;
}

export function useEventReminders(eventId: string) {
  return useQuery<EventReminder[]>({
    queryKey: ['event-reminders', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/api/events/${eventId}/reminders`);
      return data;
    },
    enabled: !!eventId,
  });
}

export function useScheduleReminder() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      type,
      scheduledFor,
      message,
    }: {
      eventId: string;
      type: 'EMAIL' | 'PUSH' | 'SMS';
      scheduledFor: Date;
      message?: string;
    }) => {
      const response = await api.post(`/api/events/${eventId}/reminders`, {
        type,
        scheduledFor,
        message,
      });
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ['event-reminders', eventId]
      });
      addToast({
        type: 'success',
        title: 'Reminder scheduled',
      });
    },
  });
}