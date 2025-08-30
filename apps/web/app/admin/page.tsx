'use client';

import React from 'react';
import {
  Users,
  DollarSign,
  MessageSquare,
  TrendingUp,
  Activity,
  UserCheck,
  FileText,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '@/lib/api';

interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  revenue: {
    total: number;
    mrr: number;
    growth: number;
  };
  content: {
    posts: number;
    comments: number;
    courses: number;
  };
  engagement: {
    dau: number;
    mau: number;
    avgSessionTime: number;
  };
}

export default function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/admin/metrics/overview');
      return response.data.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: activityChart } = useQuery({
    queryKey: ['admin-activity-chart'],
    queryFn: async () => {
      const response = await api.get('/admin/metrics/activity-chart');
      return response.data.data;
    }
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['admin-revenue-chart'],
    queryFn: async () => {
      const response = await api.get('/admin/metrics/revenue-chart');
      return response.data.data;
    }
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/activity/recent');
      return response.data.data;
    }
  });

  if (isLoading || !metrics) {
    return <div>Loading dashboard...</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value / 100);
  };

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.users.total.toLocaleString(),
      change: metrics.users.growth,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(metrics.revenue.mrr),
      change: metrics.revenue.growth,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Active Users',
      value: metrics.users.active.toLocaleString(),
      subtitle: `${metrics.engagement.dau} DAU`,
      icon: Activity,
      color: 'purple'
    },
    {
      title: 'Total Content',
      value: (metrics.content.posts + metrics.content.courses).toLocaleString(),
      subtitle: `${metrics.content.comments} comments`,
      icon: FileText,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metric.value}
                </p>
                {metric.change !== undefined && (
                  <p className={`text-sm mt-2 flex items-center ${metric.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {metric.change >= 0 ? (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(metric.change)}%
                  </p>
                )}
                {metric.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {metric.subtitle}
                  </p>
                )}
              </div>
              <metric.icon className={`h-8 w-8 ${metric.color === 'blue' && "text-blue-500"} ${metric.color === 'green' && "text-green-500"} ${metric.color === 'purple' && "text-purple-500"} ${metric.color === 'orange' && "text-orange-500"}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activityChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${activity.type === 'user' && "bg-blue-500"} ${activity.type === 'payment' && "bg-green-500"} ${activity.type === 'content' && "bg-purple-500"} ${activity.type === 'alert' && "bg-red-500"}`} />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                {activity.action && (
                  <Button size="sm" variant="outline">
                    {activity.action}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}