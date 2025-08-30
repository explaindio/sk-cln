'use client';

import { usePointsHistory } from '../../hooks/useGamification';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { formatDistanceToNow } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Award,
  MessageSquare,
  BookOpen,
  Calendar,
  Users,
  Zap
} from 'lucide-react';

const getPointIcon = (type: string) => {
  const icons: Record<string, any> = {
    POST_CREATED: MessageSquare,
    POST_LIKED: TrendingUp,
    COMMENT_CREATED: MessageSquare,
    COURSE_COMPLETED: BookOpen,
    LESSON_COMPLETED: BookOpen,
    EVENT_ATTENDED: Calendar,
    DAILY_LOGIN: Zap,
    ACHIEVEMENT_UNLOCKED: Award,
    REFERRAL: Users,
  };

  return icons[type] || Zap;
};

export function PointsHistory() {
  const { data: history, isLoading } = usePointsHistory();

  if (isLoading) {
    return <div>Loading history...</div>;
  }

  const groupedHistory = history?.reduce((groups: any, transaction: any) => {
    const date = new Date(transaction.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedHistory || {}).map(([date, transactions]: [string, any]) => (
            <div key={date}>
              <p className="text-sm font-medium text-gray-600 mb-3">
                {date === new Date().toDateString() ? 'Today' : date}
              </p>

              <div className="space-y-2">
                {transactions.map((transaction: any) => {
                  const Icon = getPointIcon(transaction.type);
                  const isPositive = transaction.amount > 0;

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isPositive ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>

                        <div>
                          <p className="font-medium text-sm">{transaction.reason}</p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(transaction.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                          {transaction.community && (
                            <p className="text-xs text-gray-500">
                              in {transaction.community.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`font-bold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? '+' : ''}{transaction.amount}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}