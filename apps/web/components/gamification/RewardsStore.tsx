'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useClaimReward } from '../../hooks/useGamification';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { ShoppingCart, Star } from 'lucide-react';

function useRewards() {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data } = await api.get('/api/gamification/rewards');
      return data;
    }
  });
}

export function RewardsStore() {
  const { data: rewards, isLoading } = useRewards();
  const claimReward = useClaimReward();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards Store</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading rewards...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards?.map((reward: any) => (
              <div key={reward.id} className="p-4 border rounded-lg flex flex-col">
                <h4 className="font-bold">{reward.name}</h4>
                <p className="text-sm text-gray-600 flex-1">{reward.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <div className="font-bold flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    {reward.cost} Points
                  </div>
                  <Button
                    size="sm"
                    onClick={() => claimReward.mutate(reward.id)}
                    isLoading={claimReward.isPending}
                    disabled={reward.stock === 0}
                  >
                    {reward.stock === 0 ? 'Out of Stock' : 'Claim'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}