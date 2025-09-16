import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  price: number;
  currency: string;
  capacity?: number;
  thumbnail?: string;
  communityId: string;
  communitySlug?: string;
  attendees?: Array<{
    id: string;
    userId: string;
    eventId: string;
    registeredAt: string;
    status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
  }>;
  waitlistEnabled?: boolean;
  registrationDeadline?: string;
  organizer?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function useEvents(communityId?: string) {
  return useQuery<Event[]>({
    queryKey: ['events', communityId],
    queryFn: async () => {
      const params = communityId ? `?communityId=${communityId}` : '';
      const { data } = await api.get(`/api/events${params}`);
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
  
  return useMutation({
    mutationFn: async (data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.post('/api/events', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useRSVP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const response = await api.post(`/api/events/${eventId}/rsvp`);
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.post(`/api/events/${eventId}/register`);
      return response.data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useCancelRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.delete(`/api/events/${eventId}/register`);
      return response.data;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useCompleteEventRegistration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, registrationData }: {
      eventId: string;
      registrationData: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dietaryRestrictions?: string;
        allergies?: string;
        specialRequirements?: string;
        guestCount?: number;
        guests?: Array<{
          name: string;
          email: string;
          dietaryRestrictions?: string;
        }>;
        paymentMethod?: string;
      }
    }) => {
      const response = await api.post(`/api/events/${eventId}/complete-registration`, registrationData);
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}