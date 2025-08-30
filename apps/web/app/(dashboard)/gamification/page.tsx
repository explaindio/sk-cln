'use client';

import { UserStats } from '../../../components/gamification/UserStats';
import { Leaderboard } from '../../../components/gamification/Leaderboard';
import { AchievementsGallery } from '../../../components/gamification/AchievementsGallery';
import { PointsHistory } from '../../../components/gamification/PointsHistory';
import { RewardsStore } from '../../../components/gamification/RewardsStore';

export default function GamificationPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Your Gamification Hub</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <UserStats />
          <RewardsStore />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <Leaderboard />
          <AchievementsGallery />
          <PointsHistory />
        </div>
      </div>
    </div>
  );
}