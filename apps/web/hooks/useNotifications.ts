'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSocket } from './useSocket';
import { useEffect, useState } from 'react';
import { useToast } from '../lib/toast';

export function useNotifications(unreadOnly: boolean = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unreadOnly) params.append('unreadOnly', 'true');
      
      const { data } = await api.get(`/api/notifications?${params}`);
      return data;
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications/preferences');
      return data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (preferences: any) => {
      const { data } = await api.patch('/api/notifications/preferences', preferences);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { onNotification } = useSocket();
  const { addToast } = useToast();
  const { data: preferences } = useNotificationPreferences();
  
  useEffect(() => {
    const unsubscribe = onNotification((notification: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Play notification sound if enabled
      if (preferences?.inAppSound) {
        const sound = preferences.notificationSound || 'default.mp3';
        const audio = new Audio(`/sounds/${sound}`);
        audio.play().catch(e => console.log('Sound playback failed:', e));
      }
      
      addToast({
        type: 'info',
        title: notification.title,
        message: notification.message,
        duration: 8000,
      });
    });
    
    return unsubscribe;
  }, [queryClient, onNotification, addToast, preferences]);
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  
  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };
  
  const subscribeToPush = async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') return false;
    }
    
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    
    await api.post('/api/notifications/push-subscribe', {
      subscription: subscription.toJSON(),
    });
    
    return true;
  };
  
  const unsubscribeFromPush = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      await api.post('/api/notifications/push-unsubscribe', {
        endpoint: subscription.endpoint,
      });
    }
  };
  
  return {
    permission,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
}