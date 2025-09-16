'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type AttendeeStatus = 'registered' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';

export interface EventAttendee {
  id: string;
  eventId: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  status: AttendeeStatus;
  ticketType?: string;
  registeredAt: string;
  checkInCode?: string;
  checkedInAt?: string;
  notes?: string;
}

export interface CreateAttendeeData {
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  ticketType?: string;
  status?: AttendeeStatus;
}

export interface UpdateAttendeeData {
  name?: string;
  email?: string;
  phone?: string;
  status?: AttendeeStatus;
  ticketType?: string;
  notes?: string;
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/api/events/${eventId}/attendees`);
      return data as EventAttendee[];
    },
    enabled: !!eventId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

export function useCreateEventAttendee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeeData: CreateAttendeeData) => {
      const { data } = await api.post(`/api/events/${attendeeData.eventId}/attendees`, attendeeData);
      return data as EventAttendee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', data.eventId] });
    },
  });
}

export function useUpdateAttendeeStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ attendeeId, status }: { attendeeId: string; status: AttendeeStatus }) => {
      const { data } = await api.patch(`/api/event-attendees/${attendeeId}/status`, { status });
      return data as EventAttendee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', data.eventId] });
    },
  });
}

export function useUpdateEventAttendee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ attendeeId, data }: { attendeeId: string; data: UpdateAttendeeData }) => {
      const { data: updated } = await api.patch(`/api/event-attendees/${attendeeId}`, data);
      return updated as EventAttendee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', data.eventId] });
    },
  });
}

export function useDeleteEventAttendee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attendeeId: string) => {
      await api.delete(`/api/event-attendees/${attendeeId}`);
    },
    onSuccess: (_, attendeeId) => {
      // Invalidate all attendee queries since we don't have the eventId
      queryClient.invalidateQueries({ queryKey: ['event-attendees'] });
    },
  });
}

export function useSendAttendeeMessage() {
  return useMutation({
    mutationFn: async ({ attendeeIds, message }: { attendeeIds: string[]; message: string }) => {
      const { data } = await api.post('/api/event-attendees/send-message', {
        attendeeIds,
        message,
      });
      return data;
    },
  });
}

export function useExportAttendees() {
  return useMutation({
    mutationFn: async ({ 
      eventId, 
      format, 
      attendeeIds 
    }: { 
      eventId: string; 
      format: string; 
      attendeeIds?: string[] 
    }) => {
      const { data } = await api.post(`/api/events/${eventId}/attendees/export`, {
        format,
        attendeeIds,
      }, {
        responseType: 'blob', // Important for file downloads
      });
      return data;
    },
  });
}

export function useCheckInAttendee() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ attendeeId, checkInCode }: { attendeeId: string; checkInCode: string }) => {
      const { data } = await api.post(`/api/event-attendees/${attendeeId}/check-in`, {
        checkInCode,
      });
      return data as EventAttendee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', data.eventId] });
    },
  });
}

export function useGenerateCheckInCodes() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post(`/api/events/${eventId}/generate-check-in-codes`);
      return data as { attendeeId: string; checkInCode: string }[];
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
    },
  });
}

// Hook for getting attendance statistics
export function useAttendanceStats(eventId: string) {
  return useQuery({
    queryKey: ['attendance-stats', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/api/events/${eventId}/attendance-stats`);
      return data as {
        total: number;
        registered: number;
        confirmed: number;
        attended: number;
        noShow: number;
        cancelled: number;
        checkInRate: number;
      };
    },
    enabled: !!eventId,
  });
}

// Hook for real-time attendance updates
export function useRealtimeAttendance(eventId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!eventId) return;
    
    // In a real implementation, this would connect to a WebSocket
    // For now, we'll use polling as a fallback
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats', eventId] });
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [eventId, queryClient]);
}

// Import useEffect for the realtime hook
import { useEffect } from 'react';