'use client';

import React, { useState } from 'react';
import EventRegistration from './EventRegistration';
import { RegistrationFormSkeleton, EventErrorBoundary, useLoadingState } from './EventLoadingStates';
import { ErrorMessage } from './EventLoadingStates';

// Enhanced EventRegistration with proper loading states
interface EventRegistrationWithLoadingProps {
  event: any;
  isRegistered?: boolean;
  isWaitlisted?: boolean;
  onRegister: (data: any) => Promise<void>;
  onCancel?: () => Promise<void>;
}

export function EventRegistrationWithLoading({
  event,
  isRegistered,
  isWaitlisted,
  onRegister,
  onCancel,
}: EventRegistrationWithLoadingProps) {
  const { isLoading, error, startLoading, setError, clearError } = useLoadingState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (data: any) => {
    setIsSubmitting(true);
    startLoading();
    try {
      await onRegister(data);
      clearError();
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again.');
      throw error; // Re-throw so the original component can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show skeleton while loading initial data
  if (isLoading && !isSubmitting) {
    return <RegistrationFormSkeleton />;
  }

  // Show error message if there's an error
  if (error) {
    return (
      <ErrorMessage
        title="Registration Error"
        message={error}
        onRetry={() => {
          clearError();
          // You could retry the registration here if needed
        }}
      />
    );
  }

  return (
    <EventErrorBoundary>
      <EventRegistration
        event={event}
        isRegistered={isRegistered}
        isWaitlisted={isWaitlisted}
        onRegister={handleRegister}
        onCancel={onCancel}
        isLoading={isSubmitting}
      />
    </EventErrorBoundary>
  );
}

// Enhanced CalendarView with loading states
interface CalendarViewWithLoadingProps {
  events: any[];
  onEventClick?: (event: any) => void;
  selectedDate?: Date;
  communitySlug?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function CalendarViewWithLoading({
  events,
  onEventClick,
  selectedDate,
  communitySlug,
  isLoading = false,
  error = null,
  onRetry,
}: CalendarViewWithLoadingProps) {
  const { CalendarView } = require('./CalendarView');

  // Import dynamically to avoid circular dependencies
  const { CalendarLoadingSkeleton, ErrorMessage, LoadingWrapper } = require('./EventLoadingStates');

  return (
    <LoadingWrapper
      isLoading={isLoading}
      error={error}
      loadingComponent={<CalendarLoadingSkeleton />}
      errorComponent={
        error ? (
          <ErrorMessage
            title="Calendar Error"
            message={error}
            onRetry={onRetry}
          />
        ) : null
      }
    >
      <EventErrorBoundary>
        <CalendarView
          events={events}
          onEventClick={onEventClick}
          selectedDate={selectedDate}
          communitySlug={communitySlug}
        />
      </EventErrorBoundary>
    </LoadingWrapper>
  );
}

// Example usage component showing how to integrate loading states
export function EventIntegrationExample() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate loading events
  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random error
      if (Math.random() > 0.7) {
        throw new Error('Failed to load events from server');
      }
      
      // Mock events data
      const mockEvents = [
        {
          id: '1',
          title: 'Community Meetup',
          description: 'Monthly community gathering',
          startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          endDate: new Date(Date.now() + 90000000).toISOString(),
          location: 'Community Center',
          isOnline: false,
          price: 0,
          currency: 'USD',
          attendees: [],
        },
        {
          id: '2',
          title: 'Workshop: Web Development',
          description: 'Learn modern web development techniques',
          startDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
          endDate: new Date(Date.now() + 176400000).toISOString(),
          location: 'Online',
          isOnline: true,
          meetingUrl: 'https://zoom.us/j/123456789',
          price: 25,
          currency: 'USD',
          attendees: [],
        },
      ];
      
      setEvents(mockEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Loading States Integration</h1>
        <p className="text-gray-600">Demonstrates proper loading state integration</p>
      </div>

      {/* Calendar with Loading States */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Calendar with Loading States</h2>
        <CalendarViewWithLoading
          events={events}
          isLoading={isLoading}
          error={error}
          onRetry={loadEvents}
        />
      </div>

      {/* Event Registration with Loading States */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Event Registration with Loading States</h2>
        {events.length > 0 && (
          <EventRegistrationWithLoading
            event={events[0]}
            onRegister={async (data) => {
              console.log('Registering with data:', data);
              // Simulate registration delay
              await new Promise(resolve => setTimeout(resolve, 2000));
            }}
          />
        )}
      </div>
    </div>
  );
}

export default {
  EventRegistrationWithLoading,
  CalendarViewWithLoading,
  EventIntegrationExample,
};