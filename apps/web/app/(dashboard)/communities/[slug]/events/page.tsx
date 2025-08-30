'use client';

import { useState } from 'react';
import { useEvents } from ''hooks/useEvents'' (see below for file content);
import { useCommunity } from ''hooks/useCommunity'' (see below for file content);
import { EventCard } from ''components/events/EventCard'' (see below for file content);
import { Calendar } from ''components/calendar/Calendar'' (see below for file content);
import { Button } from ''components/ui/Button'' (see below for file content);
import { Loading } from ''components/ui/Loading'' (see below for file content);
import { Card, CardContent } from ''components/ui/Card'' (see below for file content);
import { Plus, CalendarIcon, Grid3x3, Filter } from 'lucide-react';
import Link from 'next/link';

interface EventsPageProps {
  params: { slug: string };
}

export default function EventsPage({ params }: EventsPageProps) {
  const { data: community } = useCommunity(params.slug);
  const { data: events, isLoading } = useEvents(community?.id);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  const isOrganizer = false; // TODO: Check if user can create events

  const filteredEvents = events?.filter(event => {
    const eventDate = new Date(event.startDate);
    const now = new Date();

    if (filterType === 'upcoming' && eventDate < now) return false;
    if (filterType === 'past' && eventDate >= now) return false;
    if (showOnlineOnly && !event.isOnline) return false;

    return true;
  });

  const calendarEvents = filteredEvents?.map(event => ({
    id: event.id,
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    color: event.isOnline ? '#10b981' : '#3b82f6',
  }));

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>

          {isOrganizer && (
            <Link href={`/communities/${params.slug}/events/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex space-x-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All Events
          </Button>
          <Button
            variant={filterType === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={filterType === 'past' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('past')}
          >
            Past
          </Button>
        </div>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showOnlineOnly}
            onChange={(e) => setShowOnlineOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Online only</span>
        </label>
      </div>

      {viewMode === 'calendar' ? (
        <Calendar
          events={calendarEvents || []}
          onEventClick={(event) => {
            window.location.href = `/communities/${params.slug}/events/${event.id}`;
          }}
        />
      ) : (
        <>
          {filteredEvents?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events found</p>
                {isOrganizer && (
                  <p className="text-sm text-gray-500 mt-2">
                    Create your first event to get started!
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents?.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  communitySlug={params.slug}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}