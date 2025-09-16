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
  PlayCircle,
  BookOpen,
  CheckCircle,
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

interface CourseAnalyticsData {
  totalEnrollments: number;
  completionRate: number;
  averageEngagement: number; // in minutes
  totalRevenue: number;
  enrollmentTrend: Array<{ date: string; enrollments: number }>;
  moduleCompletions: Array<{ module: string; completed: number; total: number }>;
  engagementMetrics: Array<{ type: string; value: number }>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  popularLessons: Array<{ lesson: string; views: number }>;
}

interface CourseAnalyticsProps {
  courseId: string;
}

function useCourseAnalytics(courseId: string, dateRange?: DateRange) {
  return useQuery<CourseAnalyticsData>({
    queryKey: ['courseAnalytics', courseId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());

      const { data } = await api.get(`/api/courses/${courseId}/analytics?${params.toString()}`);
      return data;
    },
    enabled: !!courseId,
  });
}

export function CourseAnalytics({ courseId }: CourseAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { data: analytics, isLoading } = useCourseAnalytics(courseId, dateRange);
  const { addToast } = useToast();

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await api.get(`/api/courses/${courseId}/analytics/export?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `course-analytics-${format.toUpperCase()}-${format(new Date(), 'yyyy-MM-dd')}.${format}`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Analytics</h1>
          <p className="text-muted-foreground">Track performance, engagement, and revenue for your course</p>
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
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEnrollments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange ? `for selected period` : '+12% from last month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Overall course completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.averageEngagement)} min</div>
            <p className="text-xs text-muted-foreground">Average time spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(analytics.totalRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From paid enrollments</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>Enrollments over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="enrollments" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Module Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Module Completion</CardTitle>
            <CardDescription>Completion rates by module</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.moduleCompletions.map(m => ({ module: m.module, rate: (m.completed / m.total) * 100 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Completion Rate']} />
                <Bar dataKey="rate" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Student Engagement</CardTitle>
            <CardDescription>Breakdown of engagement activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.engagementMetrics}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.engagementMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Revenue over time (paid courses only)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${ (value / 100).toFixed(2) }`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Popular Lessons */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Lessons</CardTitle>
          <CardDescription>Most viewed lessons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.popularLessons.slice(0, 5).map((lesson, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{lesson.lesson}</p>
                    <p className="text-sm text-muted-foreground">{lesson.views} views</p>
                  </div>
                </div>
                <Badge variant="secondary">{Math.round((lesson.views / analytics.totalEnrollments) * 100)}% engagement</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default CourseAnalytics;