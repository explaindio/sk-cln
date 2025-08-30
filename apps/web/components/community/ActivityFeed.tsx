import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import {
  UserPlus,
  MessageSquare,
  BookOpen,
  Calendar,
  Award,
  Activity
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'member_joined' | 'post_created' | 'course_added' | 'event_created' | 'achievement';
  user: string;
  action: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const activityIcons = {
  member_joined: UserPlus,
  post_created: MessageSquare,
  course_added: BookOpen,
  event_created: Calendar,
  achievement: Award,
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type];

              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}