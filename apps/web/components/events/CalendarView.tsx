'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Video,
  DollarSign,
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isPast } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Event } from '@/hooks/useEvents';

interface CalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  selectedDate?: Date;
  communitySlug?: string;
}

type ViewMode = 'month' | 'week' | 'day';

export function CalendarView({
  events,
  onEventClick,
  selectedDate,
  communitySlug,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
    onEventClick?.(event);
  };

  const closeEventDialog = () => {
    setShowEventDialog(false);
    setSelectedEvent(null);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };

  const getEventColor = (event: Event) => {
    if (isPast(new Date(event.startDate))) {
      return 'bg-gray-100 text-gray-600';
    }
    if (event.price > 0) {
      return 'bg-green-100 text-green-700';
    }
    if (event.isOnline) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-purple-100 text-purple-700';
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={goToToday} className="ml-2">
          Today
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
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

  const renderMonthView = () => {
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayEvents = getEventsForDate(currentDay);
        const isToday = isSameDay(currentDay, new Date());
        const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);

        days.push(
          <div
            key={day.toString()}
            className={`
              min-h-[100px] p-2 border border-gray-200 transition-colors
              ${isToday ? 'bg-blue-50 border-blue-200' : ''}
              ${isSelected ? 'ring-2 ring-primary-500' : ''}
              ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}
            `}
          >
            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
              {format(currentDay, 'd')}
            </div>

            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`
                    text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity
                    ${getEventColor(event)}
                  `}
                >
                  <div className="truncate font-medium">{event.title}</div>
                  <div className="text-xs opacity-75">
                    {format(new Date(event.startDate), 'h:mm a')}
                  </div>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{dayEvents.length - 3} more
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

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentMonth);
    const weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(weekStart, i);
      const dayEvents = getEventsForDate(currentDay);
      const isToday = isSameDay(currentDay, new Date());

      weekDays.push(
        <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0">
          <div className={`p-3 border-b border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
            <div className="text-sm font-medium text-gray-600">
              {format(currentDay, 'EEE')}
            </div>
            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
              {format(currentDay, 'd')}
            </div>
          </div>
          <div className="p-2 space-y-2 min-h-[200px]">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`
                  p-2 rounded cursor-pointer hover:opacity-80 transition-opacity text-sm
                  ${getEventColor(event)}
                `}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div className="text-xs opacity-75">
                  {format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex">{weekDays}</div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentMonth);
    const isToday = isSameDay(currentMonth, new Date());

    return (
      <div className="space-y-4">
        <div className={`p-4 border border-gray-200 rounded-lg ${isToday ? 'bg-blue-50' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-gray-600">
                {format(currentMonth, 'EEEE')}
              </div>
              <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {format(currentMonth, 'MMMM d, yyyy')}
              </div>
            </div>
            {isToday && (
              <Badge className="bg-blue-100 text-blue-800">Today</Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events scheduled for this day
            </div>
          ) : (
            dayEvents.map((event) => (
              <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => handleEventClick(event)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        {event.price > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {event.currency} {event.price}
                          </Badge>
                        )}
                        {event.isOnline && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Video className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}
                        </div>
                        {event.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {event.location}
                          </div>
                        )}
                        {event.capacity && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {event.attendees?.length || 0}/{event.capacity}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderEventDialog = () => {
    if (!selectedEvent) return null;

    const eventStart = new Date(selectedEvent.startDate);
    const eventEnd = new Date(selectedEvent.endDate);
    const isPastEvent = isPast(eventStart);
    const attendeeCount = selectedEvent.attendees?.length || 0;
    const isFull = selectedEvent.capacity && attendeeCount >= selectedEvent.capacity;

    return (
      <Dialog open={showEventDialog} onOpenChange={closeEventDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">{selectedEvent.title}</DialogTitle>
                <div className="flex items-center space-x-2 mt-2">
                  {selectedEvent.price > 0 && (
                    <Badge className="bg-green-100 text-green-800">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {selectedEvent.currency} {selectedEvent.price}
                    </Badge>
                  )}
                  {selectedEvent.isOnline && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <Video className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  )}
                  {isPastEvent && (
                    <Badge className="bg-gray-100 text-gray-800">Past Event</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeEventDialog}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-gray-600">{selectedEvent.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Date & Time</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {format(eventStart, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {format(eventStart, 'h:mm a')} - {format(eventEnd, 'h:mm a')}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Location</h4>
                <div className="text-sm">
                  {selectedEvent.isOnline ? (
                    <div className="flex items-center">
                      <Video className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-blue-600">Online Event</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {selectedEvent.location || 'Location TBD'}
                    </div>
                  )}
                  {selectedEvent.meetingUrl && (
                    <div className="mt-2">
                      <a
                        href={selectedEvent.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Join Meeting →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Attendance</h4>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                <span className={`font-medium ${isFull ? 'text-red-600' : 'text-gray-900'}`}>
                  {attendeeCount} {selectedEvent.capacity ? `/${selectedEvent.capacity}` : ''} attendees
                  {isFull && ' • Event Full'}
                </span>
              </div>
            </div>

            {selectedEvent.thumbnail && (
              <div>
                <h4 className="font-semibold mb-2">Event Image</h4>
                <img
                  src={selectedEvent.thumbnail}
                  alt={selectedEvent.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="w-full">
      <Card>
        <CardContent className="p-6">
          {renderHeader()}
          
          {viewMode === 'month' && (
            <>
              {renderDaysOfWeek()}
              {renderMonthView()}
            </>
          )}
          
          {viewMode === 'week' && renderWeekView()}
          
          {viewMode === 'day' && renderDayView()}
        </CardContent>
      </Card>

      {renderEventDialog()}
    </div>
  );
}