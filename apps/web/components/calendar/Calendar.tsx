'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  selectedDate?: Date;
}

export function Calendar({
  events,
  onDateClick,
  onEventClick,
  selectedDate,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex space-x-2">
        <Button
          variant={viewMode === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('month')}
        >
          Month
        </Button>
        <Button
          variant={viewMode === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('week')}
        >
          Week
        </Button>
        <Button
          variant={viewMode === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('day')}
        >
          Day
        </Button>
      </div>
    </div>
  );

  const renderDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayEvents = events.filter((event) =>
          isSameDay(new Date(event.startDate), currentDay)
        );

        const isToday = isSameDay(currentDay, new Date());
        const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);

        days.push(
          <div
            key={day.toString()}
            onClick={() => onDateClick?.(currentDay)}
            className={`
              min-h-[80px] p-2 border border-gray-200 cursor-pointer transition-colors
              ${isToday ? 'bg-blue-50' : ''}
              ${isSelected ? 'ring-2 ring-primary-500' : ''}
              ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}
            `}
          >
            <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
              {format(currentDay, 'd')}
            </div>

            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className={`
                    text-xs p-1 rounded truncate cursor-pointer hover:opacity-80
                    ${event.color ? '' : 'bg-primary-100 text-primary-700'}
                  `}
                  style={event.color ? { backgroundColor: event.color } : {}}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{dayEvents.length - 2} more
                </div>
              )}
            </div>
          </div>
        );

        day = addDays(day, 1);
      }

      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  if (viewMode === 'week') {
    // Week view implementation
    return (
      <Card>
        <CardContent className="p-4">
          {renderHeader()}
          <div className="text-center py-8 text-gray-500">
            Week view coming soon
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'day') {
    // Day view implementation
    return (
      <Card>
        <CardContent className="p-4">
          {renderHeader()}
          <div className="text-center py-8 text-gray-500">
            Day view coming soon
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCells()}
      </CardContent>
    </Card>
  );
}