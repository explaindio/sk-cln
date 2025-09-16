'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRewards, useRedemptionHistory, useClaimReward } from '../../hooks/useGamification';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../lib/toast';
import { ShoppingCart, Star, Check, Clock, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RewardsStore() {
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: rewards, isLoading: rewardsLoading } = useRewards();
  const { data: redemptions, isLoading: historyLoading } = useRedemptionHistory();
  const claimReward = useClaimReward();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { socket } = useSocket();

  // Real-time inventory updates
  React.useEffect(() => {
    if (socket) {
      const handleRewardUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
      };
      socket.on('reward_inventory_update', handleRewardUpdate);
      return () => {
        socket.off('reward_inventory_update', handleRewardUpdate);
      };
    }
  }, [socket, queryClient]);

  const categories = React.useMemo(() => {
    const cats = ['all', ...new Set(rewards?.map((r: any) => r.category) || [])];
    return cats;
  }, [rewards]);

  const filteredRewards = React.useMemo(() => {
    return rewards?.filter((reward: any) =>
      selectedCategory === 'all' || reward.category === selectedCategory
    ) || [];
  }, [rewards, selectedCategory]);

  const handleClaim = () => {
    if (!selectedReward) return;
    claimReward.mutate(selectedReward.id, {
      onSuccess: () => {
        setShowConfirm(false);
        setSelectedReward(null);
        addToast({
          type: 'success',
          title: 'Reward Claimed!',
          message: `Congratulations! You've redeemed ${selectedReward.name} for ${selectedReward.cost} points.`,
          duration: 5000,
        });
        // Trigger success animation if needed, e.g., confetti or CSS
      },
      onError: (error) => {
        addToast({
          type: 'error',
          title: 'Claim Failed',
          message: error.message || 'Insufficient points or out of stock.',
        });
      },
    });
  };

  const getInventoryBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          Out of Stock
        </div>
      );
    } else if (stock <= 10) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Limited ({stock} left)
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Available
        </div>
      );
    }
  };

  if (rewardsLoading) {
    return <div className="text-center py-8">Loading rewards...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Rewards Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Rewards Store
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat === 'all' ? 'All Categories' : cat.replace('_', ' ')}
              </Button>
            ))}
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward: any) => (
              <Card key={reward.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg">{reward.name}</h4>
                    {getInventoryBadge(reward.stock)}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold flex items-center text-primary-600">
                      <Star className="h-4 w-4 mr-1 fill-current" />
                      {reward.cost} Points
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      if (reward.stock > 0) {
                        setSelectedReward(reward);
                        setShowConfirm(true);
                      }
                    }}
                    disabled={reward.stock === 0 || claimReward.isPending}
                    variant={reward.stock === 0 ? 'disabled' : 'default'}
                  >
                    {claimReward.isPending ? 'Claiming...' : reward.stock === 0 ? 'Out of Stock' : 'Redeem Reward'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redemption Confirmation Dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Redemption">
        {selectedReward && (
          <div className="space-y-4">
            <div className="text-center">
              <Package className="h-12 w-12 text-primary-500 mx-auto mb-2" />
              <h3 className="font-semibold text-lg mb-1">Redeem {selectedReward.name}?</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will cost {selectedReward.cost} points. Are you sure?
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleClaim} isLoading={claimReward.isPending}>
                Confirm & Redeem
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* User Redemption History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Check className="h-5 w-5 mr-2" />
            My Redemptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">Loading history...</div>
          ) : redemptions?.length ? (
            <div className="space-y-4">
              {redemptions.map((redemption: any) => (
                <div key={redemption.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium">{redemption.reward?.name || 'Reward'}</p>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(redemption.createdAt), { addSuffix: true })}
                      </p>
                      {redemption.status && (
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          redemption.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {redemption.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    -{redemption.reward?.cost} pts
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No redemptions yet. Start redeeming rewards!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}