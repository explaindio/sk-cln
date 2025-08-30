'use client';

import { useAchievements } from '../../hooks/useGamification';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ShieldCheck, Star, Crown } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface BadgesDisplayProps {
  userId?: string;
}

// This would typically come from a service or config
const getBadgeForAchievement = (achievementName: string): Badge | null => {
  const badgeMap: Record<string, Badge> = {
    prolific_poster: { id: 'b1', name: 'Prolific Poster', description: 'Create 100 posts', icon: '📝', rarity: 'rare' },
    course_completer: { id: 'b2', name: 'Dedicated Learner', description: 'Complete 5 courses', icon: '🎓', rarity: 'epic' },
    streak_master: { id: 'b3', name: 'Streak Master', description: 'Maintain a 30-day login streak', icon: '🔥', rarity: 'legendary' },
  };
  return badgeMap[achievementName] || null;
};

const RarityIcon = ({ rarity }: { rarity: Badge['rarity'] }) => {
  switch (rarity) {
    case 'rare': return <ShieldCheck className="h-4 w-4 text-blue-500" />;
    case 'epic': return <Star className="h-4 w-4 text-purple-500" />;
    case 'legendary': return <Crown className="h-4 w-4 text-yellow-500" />;
    default: return null;
  }
};

export function BadgesDisplay({ userId }: BadgesDisplayProps) {
  const { data: achievements, isLoading } = useAchievements(userId);

  if (isLoading) {
    return <div>Loading badges...</div>;
  }

  const earnedBadges = achievements
    ?.filter((a: any) => a.userProgress?.unlockedAt)
    .map((a: any) => getBadgeForAchievement(a.name))
    .filter((b: Badge | null): b is Badge => b !== null);

  if (!earnedBadges || earnedBadges.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Badges</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {earnedBadges.map((badge) => (
            <div key={badge.id} className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <h4 className="font-medium text-sm">{badge.name}</h4>
              <p className="text-xs text-gray-500 mb-2">{badge.description}</p>
              <div className="flex items-center space-x-1 text-xs">
                <RarityIcon rarity={badge.rarity} />
                <span>{badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}