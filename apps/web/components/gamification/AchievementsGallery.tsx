'use client';

import { useState } from 'react';
import { useAchievements } from '../../hooks/useGamification';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trophy, Lock, CheckCircle, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AchievementsGalleryProps {
  userId?: string;
}

export function AchievementsGallery({ userId }: AchievementsGalleryProps) {
  const { data: achievements, isLoading } = useAchievements(userId);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (isLoading) {
    return <div>Loading achievements...</div>;
  }

  const categories = [
    'all',
    ...new Set(achievements?.map((a: any) => a.category) || []),
  ];

  const filteredAchievements = achievements?.filter((achievement: any) => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const statusMatch =
      filter === 'all' ||
      (filter === 'unlocked' && achievement.userProgress?.unlockedAt) ||
      (filter === 'locked' && !achievement.userProgress?.unlockedAt);

    return categoryMatch && statusMatch;
  });

  const unlockedCount = achievements?.filter((a: any) => a.userProgress?.unlockedAt).length || 0;
  const totalCount = achievements?.length || 0;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm text-gray-600">
                  {unlockedCount} / {totalCount}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center space-x-8 text-center">
              <div>
                <p className="text-2xl font-bold">{unlockedCount}</p>
                <p className="text-sm text-gray-600">Unlocked</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {achievements?.reduce((sum: number, a: any) =>
                    sum + (a.userProgress?.unlockedAt ? a.points : 0), 0
                  )}
                </p>
                <p className="text-sm text-gray-600">Points Earned</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex space-x-2">
          {['all', 'unlocked', 'locked'].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f as any)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex space-x-2">
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements?.map((achievement: any) => {
          const isUnlocked = !!achievement.userProgress?.unlockedAt;
          const progress = achievement.userProgress?.progress || 0;
          const target = achievement.criteria?.target || 1;
          const progressPercentage = (progress / target) * 100;

          return (
            <Card
              key={achievement.id}
              className={`relative ${!isUnlocked ? 'opacity-75' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{achievement.icon}</div>
                  {isUnlocked ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <h3 className="font-medium mb-1">{achievement.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {achievement.description}
                </p>

                {!isUnlocked && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Progress</span>
                      <span>{progress} / {target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {isUnlocked && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {formatDistanceToNow(new Date(achievement.userProgress.unlockedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <span className="font-medium text-primary-600">
                      +{achievement.points} pts
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}