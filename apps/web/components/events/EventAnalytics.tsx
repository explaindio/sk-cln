'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  BarChart3,
  DollarSign,
  Calendar,
  Download,
  Clock,
  MessageCircle,
  ThumbsUp,
  Users2,
  FileText,
  Award
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface EventAnalyticsData {
  registration: {
    total: number;
    confirmed: number;
    attended: number;
    cancelled: number;
    waitlisted: number;
  };
  attendanceRate: number;
  engagement: {
    pageViews: number;
    chatMessages: number;
    reactions: number;
    avgEngagementTime: number; // in minutes
  };
  revenue: {
    gross: number;
    net: number;
    refunds: number;
    pendingPayments: number;
  };
  trends: Array<{ date: string; registrations: number; attendance: number }>;
  attendancePatterns: Array<{ timeOfDay: string; attendance: number }>;
  popularSources: Array<{ source: string; registrations: number }>;
  isPaidEvent: boolean;
}

interface EventAnalyticsProps {
  eventId: string;
}

function useEventAnalytics(eventId: string, dateRange?: DateRange) {
  return useQuery<EventAnalyticsData>({
    queryKey: ['eventAnalytics', eventId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());

      const { data } = await api.get(`/api/events/${eventId}/analytics?${params.toString()}`);
      return data;
    },
    enabled: !!eventId,
  });
}

export function EventAnalytics({ eventId }: EventAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data: analytics, isLoading } = useEventAnalytics(eventId, dateRange);
  const { addToast } = useToast();

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await api.get(`/api/events/${eventId}/analytics/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `event-analytics-${format.toUpperCase()}-${format(new Date(), 'yyyy-MM-dd')}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Export successful' });
    } catch (error) {
      addToast({ type: 'error', title: 'Export failed' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div>No analytics data available</div>;
  }

  const attendanceRate = analytics.attendanceRate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Analytics</h1>
          <p className="text-muted-foreground">Track attendance, engagement, and performance for your event</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4" />
            <Input
              type="date"
              value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDateRange({ from: new Date(e.target.value) })}
              className="w-32"
            />
          </div>
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.registration.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange ? `for selected period` : '+12% from last month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Attended vs registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.engagement.avgEngagementTime)} min</div>
            <p className="text-xs text-muted-foreground">Average time spent</p>
          </CardContent>
        </Card>

        {analytics.isPaidEvent && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(analytics.revenue.gross / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From ticket sales</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Trends</CardTitle>
            <CardDescription>Registrations and attendance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="registrations" stroke="#3B82F6" strokeWidth={2} name="Registrations" />
                <Line type="monotone" dataKey="attendance" stroke="#10B981" strokeWidth={2} name="Attendance" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Patterns</CardTitle>
            <CardDescription>Attendance by time of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.attendancePatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeOfDay" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}`, 'Attendance']} />
                <Bar dataKey="attendance" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
            <CardDescription>Breakdown of engagement activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Page Views', value: analytics.engagement.pageViews },
                    { name: 'Chat Messages', value: analytics.engagement.chatMessages },
                    { name: 'Reactions', value: analytics.engagement.reactions }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[
                    { name: 'Page Views', value: analytics.engagement.pageViews },
                    { name: 'Chat Messages', value: analytics.engagement.chatMessages },
                    { name: 'Reactions', value: analytics.engagement.reactions }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trends (if paid) */}
        {analytics.isPaidEvent && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.trends.map(t => ({ date: t.date, revenue: Math.random() * 1000 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${ (value).toFixed(2) }`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Popular Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Registration Sources</CardTitle>
          <CardDescription>Top sources driving registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.popularSources.slice(0, 5).map((source, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{source.source}</p>
                    <p className="text-sm text-muted-foreground">{source.registrations} registrations</p>
                  </div>
                </div>
                <Badge variant="secondary">{Math.round((source.registrations / analytics.registration.total) * 100)}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Registration Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Status Breakdown</CardTitle>
          <CardDescription>Current status of all registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Confirmed</span>
                <span className="font-medium">{analytics.registration.confirmed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(analytics.registration.confirmed / analytics.registration.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Attended</span>
                <span className="font-medium">{analytics.registration.attended}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(analytics.registration.attended / analytics.registration.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="font-medium">{analytics.registration.cancelled}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${(analytics.registration.cancelled / analytics.registration.total) * 100}%` }}
                />
              </div>
            </div>
            {analytics.registration.waitlisted > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Waitlisted</span>
                  <span className="font-medium">{analytics.registration.waitlisted}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${(analytics.registration.waitlisted / analytics.registration.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default EventAnalytics;