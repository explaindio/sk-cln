import { Users, BookOpen, Calendar, MessageSquare } from 'lucide-react';

interface CommunityStatsProps {
  stats: {
    memberCount: number;
    postCount: number;
    courseCount: number;
    eventCount: number;
  };
}

export function CommunityStats({ stats }: CommunityStatsProps) {
  const items = [
    { label: 'Members', value: stats.memberCount, icon: Users },
    { label: 'Posts', value: stats.postCount, icon: MessageSquare },
    { label: 'Courses', value: stats.courseCount, icon: BookOpen },
    { label: 'Events', value: stats.eventCount, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white p-4 rounded-lg border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {item.value}
              </p>
            </div>
            <item.icon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  );
}