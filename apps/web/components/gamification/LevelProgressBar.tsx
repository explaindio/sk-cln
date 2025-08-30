'use client';

import { useEffect, useState } from 'react';
import { useUserStats } from '../../hooks/useGamification';
import { Trophy } from 'lucide-react';

interface LevelProgressBarProps {
  userId?: string;
}

export function LevelProgressBar({ userId }: LevelProgressBarProps) {
  const { data: stats } = useUserStats(userId);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stats) {
      const percentage = (stats.experience / stats.nextLevelXp) * 100;
      // Animate the progress bar
      const animationTimeout = setTimeout(() => setProgress(percentage), 300);
      return () => clearTimeout(animationTimeout);
    }
  }, [stats]);

  if (!stats) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="p-4 rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          <span className="font-bold">Level {stats.level}</span>
        </div>
        <span className="text-sm text-gray-600">{stats.experience} / {stats.nextLevelXp} XP</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
        <div
          className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white mix-blend-lighten">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <div className="text-center mt-2 text-sm text-gray-500">
        {stats.nextLevelXp - stats.experience} XP to next level
      </div>
    </div>
  );
}