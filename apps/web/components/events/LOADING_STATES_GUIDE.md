# Event Loading States and Error Handling Guide

This guide explains how to use the comprehensive loading states and error handling system for event components in the Skool Clone application.

## Overview

The Event Loading States system provides:

- **Loading Skeletons**: Beautiful, animated skeleton screens for all event components
- **Error Boundaries**: React error boundaries to catch and handle JavaScript errors
- **Error Messages**: User-friendly error messages with retry functionality
- **Offline Handling**: Detection and handling of offline states
- **Retry Mechanisms**: Built-in retry functionality for failed operations
- **Loading Wrapper**: A comprehensive wrapper component for managing loading/error/offline states

## Available Components

### Loading Skeletons

#### `EventCardSkeleton`
A skeleton loader for individual event cards that matches the [`EventCard`](EventCard.tsx:1) layout.

```tsx
import { EventCardSkeleton } from '@/components/events';

// Usage
{isLoading && <EventCardSkeleton />}
```

#### `EventListSkeleton`
A grid of event card skeletons for loading multiple events.

```tsx
import { EventListSkeleton } from '@/components/events';

// Usage
{isLoading && <EventListSkeleton />}
```

#### `EventDetailSkeleton`
A skeleton loader for event detail pages with image, title, description, and metadata sections.

```tsx
import { EventDetailSkeleton } from '@/components/events';

// Usage
{isLoading && <EventDetailSkeleton />}
```

#### `RegistrationFormSkeleton`
A skeleton loader for event registration forms with form fields and submit button.

```tsx
import { RegistrationFormSkeleton } from '@/components/events';

// Usage
{isLoading && <RegistrationFormSkeleton />}
```

#### `CalendarLoadingSkeleton`
A skeleton loader for calendar views with month navigation and day grid.

```tsx
import { CalendarLoadingSkeleton } from '@/components/events';

// Usage
{isLoading && <CalendarLoadingSkeleton />}
```

### Error Components

#### `ErrorMessage`
A user-friendly error message component with optional retry functionality.

```tsx
import { ErrorMessage } from '@/components/events';

// Basic usage
<ErrorMessage message="Failed to load events" />

// With retry
<ErrorMessage 
  title="Network Error"
  message="Unable to connect to the server"
  onRetry={() => fetchEvents()}
/>
```

#### `OfflineIndicator`
A component that displays when the user is offline with retry functionality.

```tsx
import { OfflineIndicator } from '@/components/events';

// Usage
<OfflineIndicator onRetry={() => checkConnection()} />
```

### Error Boundary

#### `EventErrorBoundary`
A React error boundary that catches JavaScript errors in event components.

```tsx
import { EventErrorBoundary } from '@/components/events';

// Usage
<EventErrorBoundary 
  onError={(error, errorInfo) => logError(error, errorInfo)}
  fallback={<CustomErrorFallback />}
>
  <YourEventComponent />
</EventErrorBoundary>
```

### Hooks

#### `useLoadingState`
A custom hook for managing loading, error, and offline states.

```tsx
import { useLoadingState } from '@/components/events';

// Usage
function MyComponent() {
  const {
    isLoading,
    error,
    isOffline,
    startLoading,
    setError,
    clearError,
    setOffline,
    reset
  } = useLoadingState();

  const fetchData = async () => {
    startLoading();
    try {
      const data = await api.getEvents();
      clearError();
      return data;
    } catch (err) {
      setError('Failed to load events');
    }
  };

  return (
    <div>
      {isLoading && <EventListSkeleton />}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}
      {isOffline && <OfflineIndicator onRetry={fetchData} />}
      {!isLoading && !error && !isOffline && <YourContent />}
    </div>
  );
}
```

### Loading Wrapper

#### `LoadingWrapper`
A comprehensive wrapper component that handles loading, error, and offline states.

```tsx
import { LoadingWrapper, EventListSkeleton, ErrorMessage } from '@/components/events';

// Usage
<LoadingWrapper
  isLoading={isLoading}
  error={error}
  isOffline={isOffline}
  onRetry={fetchEvents}
  loadingComponent={<EventListSkeleton />}
  errorComponent={<ErrorMessage title="Custom Error" message={error} />}
>
  <YourEventContent />
</LoadingWrapper>
```

## Integration Examples

### Basic Event List with Loading States

```tsx
import React, { useState, useEffect } from 'react';
import { EventCard, EventListSkeleton, ErrorMessage, useLoadingState } from '@/components/events';

function EventList({ communityId }) {
  const [events, setEvents] = useState([]);
  const { isLoading, error, startLoading, setError, clearError } = useLoadingState();

  const fetchEvents = async () => {
    startLoading();
    try {
      const response = await fetch(`/api/communities/${communityId}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      setEvents(data);
      clearError();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [communityId]);

  if (isLoading) {
    return <EventListSkeleton />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Events Error"
        message={error}
        onRetry={fetchEvents}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### Event Registration with Comprehensive Error Handling

```tsx
import React from 'react';
import { 
  EventRegistrationWithLoading, 
  EventErrorBoundary,
  RegistrationFormSkeleton 
} from '@/components/events';

function EventRegistrationPage({ eventId }) {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Event not found');
      
      const data = await response.json();
      setEvent(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (formData) => {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
  };

  if (isLoading) {
    return <RegistrationFormSkeleton />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Event Error"
        message={error}
        onRetry={fetchEvent}
      />
    );
  }

  return (
    <EventErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Registration error:', error, errorInfo);
      }}
    >
      <EventRegistrationWithLoading
        event={event}
        onRegister={handleRegister}
      />
    </EventErrorBoundary>
  );
}
```

### Calendar View with Loading Wrapper

```tsx
import React, { useState, useEffect } from 'react';
import { CalendarViewWithLoading, useLoadingState } from '@/components/events';

function CalendarPage({ communityId }) {
  const [events, setEvents] = useState([]);
  const { isLoading, error, startLoading, setError, clearError } = useLoadingState();

  const fetchEvents = async () => {
    startLoading();
    try {
      const response = await fetch(`/api/communities/${communityId}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      setEvents(data);
      clearError();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [communityId]);

  return (
    <CalendarViewWithLoading
      events={events}
      isLoading={isLoading}
      error={error}
      onRetry={fetchEvents}
    />
  );
}
```

## Best Practices

### 1. Always Use Error Boundaries
Wrap your event components with error boundaries to catch unexpected JavaScript errors:

```tsx
<EventErrorBoundary>
  <YourEventComponent />
</EventErrorBoundary>
```

### 2. Handle All States
Always handle loading, error, and success states:

```tsx
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage />;
return <Content />;
```

### 3. Provide Retry Functionality
Always provide retry functionality for error states:

```tsx
<ErrorMessage
  message="Failed to load events"
  onRetry={fetchEvents}
/>
```

### 4. Use Appropriate Skeletons
Use skeletons that match your content layout:

- Use `EventCardSkeleton` for individual event cards
- Use `EventListSkeleton` for event grids
- Use `RegistrationFormSkeleton` for registration forms
- Use `CalendarLoadingSkeleton` for calendar views

### 5. Handle Offline States
Check for offline status and provide appropriate feedback:

```tsx
const { isOffline } = useLoadingState();

if (isOffline) {
  return <OfflineIndicator onRetry={fetchData} />;
}
```

### 6. Clean Up Resources
Always clean up in useEffect cleanup functions:

```tsx
useEffect(() => {
  let cancelled = false;
  
  const fetchData = async () => {
    startLoading();
    try {
      const data = await api.getEvents();
      if (!cancelled) {
        setEvents(data);
        clearError();
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message);
      }
    }
  };
  
  fetchData();
  
  return () => {
    cancelled = true;
  };
}, []);
```

## Styling and Theming

All loading states and error components follow the Skool design system:

- **Colors**: Use the defined color palette from the design guide
- **Typography**: Consistent font sizes and weights
- **Spacing**: Follow the 4px grid system
- **Animations**: Subtle pulse animations for skeletons
- **Borders**: Consistent border styles and colors

## Testing

The system includes comprehensive tests for all components:

```bash
# Run tests
npm test EventLoadingStates

# Run specific test suites
npm test -- --testNamePattern="Skeleton Components"
npm test -- --testNamePattern="Error Components"
npm test -- --testNamePattern="Error Boundary"
```

## Demo Page

Visit `/events/loading-test` to see all loading states and error handling components in action.

## Troubleshooting

### Common Issues

1. **Skeletons not animating**: Ensure Tailwind CSS `animate-pulse` class is available
2. **Error boundary not catching errors**: Ensure errors are thrown in child components, not in event handlers
3. **Offline detection not working**: Check browser permissions and network status API support
4. **Retry not working**: Ensure `onRetry` functions are properly bound and async operations are handled

### Debug Mode

Enable debug logging by setting:
```tsx
window.DEBUG_EVENT_LOADING = true;
```

This will log detailed information about loading states, errors, and retry attempts.

## Conclusion

This comprehensive loading states and error handling system ensures a smooth, professional user experience when dealing with event data fetching, loading, and network issues. By following this guide, you can implement robust error handling and loading states that match the Skool design aesthetic and provide clear paths to recovery when things go wrong.