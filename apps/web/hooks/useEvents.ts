import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface Event {
  id: string;
  title: string;
  description: string;
  communityId: string;
  organizerId: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  capacity?: number;
  price: number;
  currency: string;
  thumbnail?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  attendees: Attendee[];
  createdAt: string;
  updatedAt: string;
}

interface Attendee {
  id: string;
  userId: string;
  eventId: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED';
  registeredAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export function useEvents(communityId?: string, dateRange?: { start: Date; end: Date }) {
  return useQuery<Event[]>({
    queryKey: ['events', communityId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (communityId) params.append('communityId', communityId);
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }

      const { data } = await api.get(`/api/events?${params}`);
      return data;
    },
  });
}

export function useEvent(eventId: string) {
  return useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/api/events/${eventId}`);
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (eventData: Partial<Event>) => {
      const response = await api.post('/api/events', eventData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: 'Event created successfully',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to create event',
        message: error.response?.data?.error,
      });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: Partial<Event>;
    }) => {
      const response = await api.patch(`/api/events/${eventId}`, data);
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      addToast({
        type: 'success',
        title: 'Event updated',
      });
    },
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.post(`/api/events/${eventId}/register`);
      return response.data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      addToast({
        type: 'success',
        title: 'Successfully registered for event',
      });
    },
  });
}

export function useCancelRegistration() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/api/events/${eventId}/register`);
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      addToast({
        type: 'success',
        title: 'Registration cancelled',
      });
    },
  });
}

export function useMyEvents() {
  return useQuery<Event[]>({
    queryKey: ['my-events'],
    queryFn: async () => {
      const { data } = await api.get('/api/events/my-events');
      return data;
    },
  });
}