'use client';

import { useAuthStore } from '../../../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Users, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Communities', value: '3', icon: Users, color: 'bg-blue-500' },
  { label: 'Courses', value: '12', icon: BookOpen, color: 'bg-green-500' },
  { label: 'Posts', value: '48', icon: MessageSquare, color: 'bg-purple-500' },
  { label: 'Points', value: '1,250', icon: TrendingUp, color: 'bg-orange-500' },
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome back, {user?.firstName || user?.username}!
      </h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Communities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You haven't joined any communities yet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}