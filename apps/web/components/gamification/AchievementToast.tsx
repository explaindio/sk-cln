'use client';

import { Trophy } from 'lucide-react';

interface AchievementToastProps {
  title: string;
  message: string;
  icon: string;
  points?: number;
}

export function AchievementToast({ title, message, icon, points }: AchievementToastProps) {
  return (
    <div className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-lg border border-yellow-300 max-w-sm">
      <div className="text-4xl mr-4 animate-bounce">
        {icon || '🏆'}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-yellow-800">{title}</h4>
        <p className="text-sm text-gray-700">{message}</p>
        {points && (
          <p className="text-xs text-yellow-600 mt-1 font-semibold">
            +{points} points earned!
          </p>
        )}
      </div>
      <Trophy className="h-5 w-5 text-yellow-600 ml-2" />
    </div>
  );
}