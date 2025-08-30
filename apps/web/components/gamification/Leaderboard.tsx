'use client';

import { useState } from 'react';
import { useLeaderboard, useMyRank } from '../../hooks/useGamification';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Image from 'next/image';

interface LeaderboardProps {
  communityId?: string;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

export function Leaderboard({ communityId }: LeaderboardProps) {
  const [period, setPeriod] = useState<Period>('weekly');
  const { data: leaderboard, isLoading } = useLeaderboard(period, communityId);
  const { data: myRank } = useMyRank(period, communityId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-sm font-medium text-gray-600">#{rank}</span>;
    }
  };

  const getChangeIcon = (change?: number) => {
    if (change === undefined || change === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Leaderboard</CardTitle>
          <div className="flex space-x-2">
            {(['daily', 'weekly', 'monthly', 'all_time'] as Period[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                onClick={() => setPeriod(p)}
              >
                {p === 'all_time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loading size="lg" />
        ) : (
          <div className="space-y-2">
            {leaderboard?.slice(0, 3).map((entry: any) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  entry.rank === 1 ? 'bg-yellow-50 border border-yellow-200' :
                  entry.rank === 2 ? 'bg-gray-50 border border-gray-200' :
                  'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>

                  <Image
                    src={entry.avatar || '/default-avatar.png'}
                    alt={entry.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />

                  <div>
                    <p className="font-medium">{entry.username}</p>
                    {entry.level && (
                      <p className="text-xs text-gray-600">Level {entry.level}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(entry.change)}
                    {entry.change !== 0 && (
                      <span className="text-xs text-gray-600">
                        {Math.abs(entry.change)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{entry.points}</p>
                    <p className="text-xs text-gray-600">points</p>
                  </div>
                </div>
              </div>
            ))}

            {leaderboard?.slice(3).map((entry: any) => (
              <div
                key={entry.userId}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 text-center">
                    <span className="text-sm text-gray-600">#{entry.rank}</span>
                  </div>

                  <Image
                    src={entry.avatar || '/default-avatar.png'}
                    alt={entry.username}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />

                  <p className="text-sm">{entry.username}</p>
                </div>

                <div className="flex items-center space-x-3">
                  {getChangeIcon(entry.change)}
                  <p className="font-medium">{entry.points}</p>
                </div>
              </div>
            ))}

            {myRank && myRank.rank > 100 && (
              <>
                <div className="border-t my-4" />
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 text-center">
                      <span className="font-medium">#{myRank.rank}</span>
                    </div>
                    <div className="w-10 h-10 bg-primary-200 rounded-full" />
                    <p className="font-medium">You</p>
                  </div>
                  <p className="font-bold">{myRank.points}</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}