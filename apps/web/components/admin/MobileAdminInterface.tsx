import React, { useState, useRef, useEffect, TouchEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // Assuming this exists based on existing admin pages
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { User, Users, AlertTriangle, BarChart3, Ban, Edit } from 'lucide-react'; // Assuming lucide-react is used
import { Skeleton } from '../ui/Skeleton'; // For loading states

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  flaggedContent: number;
  revenueToday: number;
  // Add more as needed
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'banned' | 'pending';
  lastActivity: string;
}

interface FlaggedPost {
  id: string;
  title: string;
  author: string;
  reason: string;
  timestamp: string;
}

interface MobileAdminInterfaceProps {
  communityId?: string;
  onAction?: (action: string, itemId: string) => void;
}

export function MobileAdminInterface({ communityId, onAction }: MobileAdminInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'moderation' | 'analytics'>('dashboard');
  const [swipeStates, setSwipeStates] = useState<Record<string, number>>({});
  const touchRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['mobile-admin-metrics', communityId],
    queryFn: async () => {
      const params = communityId ? `?communityId=${communityId}` : '';
      const response = await api.get(`/admin/metrics/overview${params}`);
      return response.data.data;
    },
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<UserItem[]>({
    queryKey: ['mobile-admin-users', communityId],
    queryFn: async () => {
      const params = communityId ? `?communityId=${communityId}` : '';
      const response = await api.get(`/admin/users${params}`);
      return response.data.data.users || [];
    },
  });

  // Fetch flagged content
  const { data: flaggedPosts, isLoading: flaggedLoading } = useQuery<FlaggedPost[]>({
    queryKey: ['mobile-admin-flagged', communityId],
    queryFn: async () => {
      const params = communityId ? `?communityId=${communityId}` : '';
      const response = await api.get(`/admin/moderation/flagged${params}`);
      return response.data.data || [];
    },
  });

  // Basic swipe handler for lists
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>, itemId: string) => {
    const touch = e.touches[0];
    setSwipeStates(prev => ({ ...prev, [itemId]: { startX: touch.clientX, translateX: 0 } }));
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>, itemId: string) => {
    const touch = e.touches[0];
    const currentState = swipeStates[itemId];
    if (!currentState) return;

    const deltaX = touch.clientX - currentState.startX;
    // Only allow left swipe for actions (reveal buttons)
    if (deltaX < 0 && Math.abs(deltaX) < 100) { // Threshold for swipe
      setSwipeStates(prev => ({
        ...prev,
        [itemId]: { ...currentState, translateX: deltaX },
      }));
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>, itemId: string) => {
    const currentState = swipeStates[itemId];
    if (!currentState) return;

    const deltaX = currentState.translateX;
    if (Math.abs(deltaX) > 50) { // Swipe threshold
      // Perform action (e.g., ban)
      onAction?.('ban', itemId);
      setSwipeStates(prev => ({ ...prev, [itemId]: -100 })); // Reveal action area
      setTimeout(() => {
        setSwipeStates(prev => ({ ...prev, [itemId]: 0 })); // Reset after action
      }, 2000);
    } else {
      setSwipeStates(prev => ({ ...prev, [itemId]: 0 }));
    }
  };

  const resetSwipe = (itemId: string) => {
    setSwipeStates(prev => ({ ...prev, [itemId]: 0 }));
  };

  // Render swipeable user item
  const renderUserItem = (user: UserItem) => (
    <div
      key={user.id}
      ref={el => (touchRefs.current[user.id] = el)}
      className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-2 overflow-hidden"
      onTouchStart={(e) => handleTouchStart(e, user.id)}
      onTouchMove={(e) => handleTouchMove(e, user.id)}
      onTouchEnd={(e) => handleTouchEnd(e, user.id)}
    >
      {/* Action buttons (revealed on swipe) */}
      <div className="absolute right-0 top-0 h-full bg-red-500 flex items-center px-4 z-10" style={{ transform: `translateX(${swipeStates[user.id]?.translateX || 0}px)` }}>
        <Button variant="destructive" size="sm" className="rounded-none" onClick={() => onAction?.('ban', user.id)}>
          <Ban className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" className="rounded-none" onClick={() => onAction?.('edit', user.id)}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex items-center p-4" style={{ transform: `translateX(${swipeStates[user.id]?.translateX || 0}px)` }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.role} • {user.status}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.lastActivity}</p>
        </div>
      </div>
    </div>
  );

  // Similar for flagged posts
  const renderFlaggedItem = (post: FlaggedPost) => (
    <div
      key={post.id}
      className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-2 overflow-hidden"
      onTouchStart={(e) => handleTouchStart(e, post.id)}
      onTouchMove={(e) => handleTouchMove(e, post.id)}
      onTouchEnd={(e) => handleTouchEnd(e, post.id)}
    >
      <div className="absolute right-0 top-0 h-full bg-red-500 flex items-center px-4 z-10" style={{ transform: `translateX(${swipeStates[post.id]?.translateX || 0}px)` }}>
        <Button variant="destructive" size="sm" className="rounded-none" onClick={() => onAction?.('remove', post.id)}>
          <Ban className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" className="rounded-none" onClick={() => onAction?.('review', post.id)}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4" style={{ transform: `translateX(${swipeStates[post.id]?.translateX || 0}px)` }}>
        <p className="font-medium text-gray-900 dark:text-white">{post.title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">By {post.author}</p>
        <p className="text-xs text-red-500 dark:text-red-400">{post.reason}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{post.timestamp}</p>
      </div>
    </div>
  );

  // Touch-friendly analytics cards (larger, tappable to expand)
  const AnalyticsCard = ({ title, value, icon: Icon, onTap }: { title: string; value: string | number; icon: React.ElementType; onTap?: () => void }) => (
    <Card className="w-full h-24 flex items-center justify-between p-4 cursor-pointer active:scale-95 transition-transform" onClick={onTap}>
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </Card>
  );

  if (metricsLoading && usersLoading && flaggedLoading) {
    return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 md:p-4">
      {/* Mobile Tab Navigation - Simplified for one-handed use */}
      <div className="flex space-x-1 mb-4 overflow-x-auto pb-2">
        {[
          { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
          { key: 'users' as const, label: 'Users', icon: Users },
          { key: 'moderation' as const, label: 'Moderation', icon: AlertTriangle },
          { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              size="sm"
              className={`flex-shrink-0 whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-500 text-white' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4 mr-1" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <AnalyticsCard
              title="Total Users"
              value={metrics?.totalUsers || 0}
              icon={Users}
              onTap={() => setActiveTab('users')}
            />
            <AnalyticsCard
              title="Active Users"
              value={metrics?.activeUsers || 0}
              icon={User}
              onTap={() => setActiveTab('users')}
            />
            <AnalyticsCard title="Total Posts" value={metrics?.totalPosts || 0} icon={Users} />
            <AnalyticsCard title="Flagged" value={metrics?.flaggedContent || 0} icon={AlertTriangle} onTap={() => setActiveTab('moderation')} />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">User Management</h2>
            {usersLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              users?.map(renderUserItem) || <p className="text-gray-500 dark:text-gray-400">No users found.</p>
            )}
          </div>
        )}

        {activeTab === 'moderation' && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Moderation Queue</h2>
            {flaggedLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              flaggedPosts?.map(renderFlaggedItem) || <p className="text-gray-500 dark:text-gray-400">No flagged content.</p>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analytics</h2>
            {/* Touch-friendly expandable cards */}
            <AnalyticsCard title="Revenue Today" value={`$${metrics?.revenueToday || 0}`} icon={BarChart3} />
            {/* Add more cards or charts optimized for touch */}
          </div>
        )}
      </div>
    </div>
  );
}