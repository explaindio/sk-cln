import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function usePostSearch(query: string, communityId?: string) {
  return useQuery({
    queryKey: ['post-search', query, communityId],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (communityId) params.append('communityId', communityId);

      const { data } = await api.get(`/api/posts/search?${params}`);
      return data;
    },
    enabled: query.length > 2,
  });
}