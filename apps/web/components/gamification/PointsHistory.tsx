'use client';

import { useState, useEffect } from 'react';

import { usePointsHistory, usePoints } from '../../hooks/useGamification';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
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
  Zap,
  Download
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
  const { data: history, isLoading: historyLoading } = usePointsHistory();
  const { data: pointsData, isLoading: pointsLoading } = usePoints();
  const [selectedSource, setSelectedSource] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSource, dateFrom, dateTo]);

  if (historyLoading || pointsLoading) {
    return <div>Loading...</div>;
  }

  const sources = [
    { value: 'all', label: 'All Sources' },
    { value: 'POST_CREATED', label: 'Posts' },
    { value: 'POST_LIKED', label: 'Likes' },
    { value: 'COMMENT_CREATED', label: 'Comments' },
    { value: 'COURSE_COMPLETED', label: 'Courses Completed' },
    { value: 'LESSON_COMPLETED', label: 'Lessons Completed' },
    { value: 'EVENT_ATTENDED', label: 'Events Attended' },
    { value: 'DAILY_LOGIN', label: 'Daily Login' },
    { value: 'ACHIEVEMENT_UNLOCKED', label: 'Achievements' },
    { value: 'REFERRAL', label: 'Referrals' },
  ];

  const filteredHistory = history?.filter(transaction => {
    const matchesSource = selectedSource === 'all' || transaction.type === selectedSource;
    const transactionDate = new Date(transaction.createdAt);
    const matchesDateFrom = !dateFrom || transactionDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || transactionDate <= new Date(dateTo);
    return matchesSource && matchesDateFrom && matchesDateTo;
  }) || [];

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Reason', 'Amount', 'Community'];
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(transaction => [
        new Date(transaction.createdAt).toLocaleDateString(),
        transaction.type,
        `"${transaction.reason.replace(/"/g, '""')}"`,
        transaction.amount,
        `"${(transaction.community?.name || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `points-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head><title>Points History Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
        </head>
        <body>
          <h1>Points History</h1>
          <p>Current Balance: ${pointsData?.points?.toLocaleString() || pointsData?.toLocaleString() || '0'} points</p>
          <table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Reason</th><th>Amount</th><th>Community</th></tr>
            </thead>
            <tbody>
              ${filteredHistory.map(transaction => `
                <tr>
                  <td>${new Date(transaction.createdAt).toLocaleDateString()}</td>
                  <td>${transaction.type}</td>
                  <td>${transaction.reason}</td>
                  <td>${transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}</td>
                  <td>${transaction.community?.name || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };


  // Pagination on flat list
  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const paginatedTransactions = filteredHistory.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const groupedHistory = paginatedTransactions.reduce((groups: any, transaction: any) => {
    const date = new Date(transaction.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <span>Points History</span>
          <div className="mt-2 sm:mt-0">
            <p className="text-2xl font-bold text-gray-900">
              {pointsData?.points?.toLocaleString() || pointsData?.toLocaleString() || '0'} points
            </p>
            <p className="text-sm text-gray-600">Current Balance</p>
          </div>
          <div className="px-6 pb-4">
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <div className="px-6 pb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source.value} value={source.value}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            className="w-32"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            className="w-32"
          />
        </div>
      </div>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}