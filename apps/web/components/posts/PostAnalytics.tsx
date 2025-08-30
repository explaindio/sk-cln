import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  Eye,
  Heart,
  MessageSquare,
  Share2,
  TrendingUp,
  Users
} from 'lucide-react';

interface PostAnalyticsProps {
  analytics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    reach: number;
  };
}

export function PostAnalytics({ analytics }: PostAnalyticsProps) {
  const stats = [
    { label: 'Views', value: analytics.views, icon: Eye, color: 'text-blue-600' },
    { label: 'Likes', value: analytics.likes, icon: Heart, color: 'text-red-600' },
    { label: 'Comments', value: analytics.comments, icon: MessageSquare, color: 'text-green-600' },
    { label: 'Shares', value: analytics.shares, icon: Share2, color: 'text-purple-600' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center space-x-3">
              <div className={`p-2 bg-gray-100 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Engagement Rate</span>
            </div>
            <span className="text-2xl font-semibold">
              {analytics.engagement}%
            </span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Total Reach</span>
            </div>
            <span className="text-2xl font-semibold">
              {analytics.reach}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}