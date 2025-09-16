import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useUserStats(userId?: string) {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const endpoint = userId
        ? `/api/gamification/users/${userId}/stats`
        : '/api/gamification/my-stats';
      const { data } = await api.get(endpoint);
      return data;
    },
  });
}

export function usePoints(userId?: string) {
  return useQuery({
    queryKey: ['points', userId],
    queryFn: async () => {
      const endpoint = userId
        ? `/api/gamification/users/${userId}/points`
        : '/api/gamification/my-points';
      const { data } = await api.get(endpoint);
      return data;
    },
  });
}

export function usePointsHistory() {
  return useQuery({
    queryKey: ['points-history'],
    queryFn: async () => {
      const { data } = await api.get('/api/gamification/my-points/history');
      return data;
    },
  });
}

export function useAchievements(userId?: string) {
  return useQuery({
    queryKey: ['achievements', userId],
    queryFn: async () => {
      const endpoint = userId
        ? `/api/gamification/users/${userId}/achievements`
        : '/api/gamification/my-achievements';
      const { data } = await api.get(endpoint);
      return data;
    },
  });
}

export function useLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  communityId?: string
) {
  return useQuery({
    queryKey: ['leaderboard', period, communityId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (communityId) params.append('communityId', communityId);

      const { data } = await api.get(`/api/gamification/leaderboard?${params}`);
      return data;
    },
  });
}

export function useMyRank(
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  communityId?: string
) {
  return useQuery({
    queryKey: ['my-rank', period, communityId],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (communityId) params.append('communityId', communityId);

      const { data } = await api.get(`/api/gamification/my-rank?${params}`);
      return data;
    },
  });
}

export function useStreaks() {
  return useQuery({
    queryKey: ['streaks'],
    queryFn: async () => {
      const { data } = await api.get('/api/gamification/my-streaks');
      return data;
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data } = await api.get('/api/gamification/rewards');
      return data;
    },
  });
}

export function useRedemptionHistory() {
  return useQuery({
    queryKey: ['redemption-history'],
    queryFn: async () => {
      const { data } = await api.get('/api/gamification/my-redemptions');
      return data;
    },
  });
}

export function useClaimReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await api.post(`/api/gamification/rewards/${rewardId}/claim`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['redemption-history'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}