'use client';

import { useUserStats, useStreaks } from '../../hooks/useGamification';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import {
  Trophy,
  Zap,
  TrendingUp,
  Award,
  Flame,
  Star,
  Target
} from 'lucide-react';

interface UserStatsProps {
  userId?: string;
}

export function UserStats({ userId }: UserStatsProps) {
  const { data: stats, isLoading } = useUserStats(userId);
  const { data: streaks } = useStreaks();

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  if (!stats) {
    return null;
  }

  const levelProgress = (stats.experience / stats.nextLevelXp) * 100;

  return (
    <div className="space-y-6">
      {/* Level & Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Level {stats.level} - {stats.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Experience</span>
                <span>{stats.experience} / {stats.nextLevelXp} XP</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>

            {stats.badge && (
              <div className="flex items-center justify-center">
                <img src={stats.badge} alt="Level Badge" className="h-20 w-20" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Points Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold">{stats.totalPoints}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">{stats.monthlyPoints}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streaks */}
      {streaks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Flame className="h-5 w-5 mr-2 text-orange-500" />
              Active Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {streaks.dailyLogin && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Flame className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{streaks.dailyLogin.currentDays} days</p>
                    <p className="text-xs text-gray-600">Daily Login</p>
                  </div>
                </div>
              )}

              {streaks.dailyPost && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{streaks.dailyPost.currentDays} days</p>
                    <p className="text-xs text-gray-600">Daily Post</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.postsCreated}</p>
              <p className="text-sm text-gray-600">Posts</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.likesReceived}</p>
              <p className="text-sm text-gray-600">Likes</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.achievementsUnlocked}</p>
              <p className="text-sm text-gray-600">Achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}