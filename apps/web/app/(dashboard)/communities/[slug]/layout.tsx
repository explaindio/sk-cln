'use client';

import { ReactNode } from 'react';
import { useCommunity } from '@/hooks/useCommunity';
import { useAuthStore } from '@/store/authStore';
import { JoinButton } from '@/components/community/JoinButton';
import { CommunityStats } from '@/components/community/CommunityStats';
import { CommunityRules } from '@/components/community/CommunityRules';
import { Announcements } from '@/components/community/Announcements';
import { ActivityFeed } from '@/components/community/ActivityFeed';
import { Card, CardContent } from '@/components/ui/Card';

interface CommunityLayoutProps {
  children: ReactNode;
  params: { slug: string };
}

export default function CommunityLayout({ children, params }: CommunityLayoutProps) {
  const { slug } = params;
  const user = useAuthStore((state) => state.user);
  const { data: community, isLoading } = useCommunity(slug);

  // For now, we'll assume membership status - this could be enhanced
  // to actually check if the user is a member of the community
  const isMember = false; // TODO: Implement actual membership check

  // Check if user is owner or admin/moderator
  const isOwner = community?.owner.id === user?.id;
  // TODO: Implement member roles check when members array is available in community object
  // const isAdmin = community?.members?.some(m => m.userId === user?.id && (m.role === 'ADMIN' || m.role === 'MODERATOR')) || false;
  const isAdmin = false; // Placeholder until members array is implemented

  return (
    <div className="space-y-6">
      {/* Community Header */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : community ? (
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{community.name}</h1>
                <p className="text-gray-600 mt-1">{community.description}</p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className="text-sm text-gray-500">{community.memberCount} members</span>
                  <span className="text-sm text-gray-500">Created by {community.owner.username}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {community && (
                  <JoinButton
                    communitySlug={community.slug}
                    communityType={community.type}
                    isMember={isMember}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-500">Community not found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {children}
        </div>
        <div className="space-y-6">
          <CommunityStats
            stats={{
              memberCount: community?.memberCount || 0,
              postCount: 0, // TODO: Get from API
              courseCount: 0, // TODO: Get from API
              eventCount: 0, // TODO: Get from API
            }}
          />

          <CommunityRules
            rules={[]} // TODO: Get from API
            canEdit={isOwner}
          />

          <Announcements
            announcements={[]} // TODO: Get from API
            canCreate={isOwner || isAdmin}
          />

          <ActivityFeed
            activities={[]} // TODO: Get from API
          />
        </div>
      </div>
    </div>
  );
}