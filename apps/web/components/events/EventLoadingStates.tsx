'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { AlertCircle, WifiOff, RefreshCw, Calendar, Clock, MapPin, Users, Video, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================
// Loading Skeletons
// ==========================

export function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-md rounded-lg border-0 bg-white animate-pulse">
      {/* Header with Image Skeleton */}
      <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
        <div className="flex items-center justify-center h-full bg-gray-200">
          <Calendar className="h-12 w-12 text-gray-300" />
        </div>
        <div className="absolute top-3 right-3 h-6 w-16 bg-gray-300 rounded-full" />
      </div>

      {/* Content Skeleton */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <CardHeader className="p-0 mb-3">
          {/* Date and Price Skeleton */}
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
          </div>

          {/* Title Skeleton */}
          <div className="h-6 w-full bg-gray-200 rounded mb-2" />

          {/* Description Skeleton */}
          <div className="space-y-1 mb-4">
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-4/5 bg-gray-200 rounded" />
            <div className="h-3 w-3/5 bg-gray-200 rounded" />
          </div>
        </CardHeader>

        {/* Event Details Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-300" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-gray-300" />
            <div className="h-3 w-32 bg-gray-200 rounded" />
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-gray-300" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="h-10 bg-gray-200 rounded flex-1" />
          <div className="h-10 bg-gray-200 rounded flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EventDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <Card className="overflow-hidden">
        <div className="aspect-video bg-gray-200 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="h-16 w-16 text-gray-300" />
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3 flex-1">
              <div className="h-8 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
            </div>
            <div className="h-10 w-24 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-full bg-gray-200 rounded mb-2" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
        </CardContent>
      </Card>

      {/* Details Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center">
                  <div className="h-5 w-5 bg-gray-200 rounded mr-3" />
                  <div className="h-4 bg-gray-200 rounded flex-1" style={{ width: `${70 - i * 5}%` }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RegistrationFormSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto animate-pulse">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Form Fields Skeleton */}
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ))}
          
          {/* Submit Button Skeleton */}
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarLoadingSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        {/* Calendar Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="flex space-x-2">
            <div className="h-10 w-10 bg-gray-200 rounded" />
            <div className="h-10 w-10 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================
// Error Components
// ==========================

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ 
  title = 'Something went wrong', 
  message, 
  onRetry, 
  className 
}: ErrorMessageProps) {
  return (
    <Card className={cn('border-red-200 bg-red-50', className)}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 mb-1">{title}</h3>
            <p className="text-sm text-red-700 mb-4">{message}</p>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OfflineIndicator({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3">
          <WifiOff className="h-5 w-5 text-yellow-600" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900">You're offline</h3>
            <p className="text-sm text-yellow-700">Check your connection and try again.</p>
          </div>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================
// Error Boundary
// ==========================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class EventErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Event Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-red-200">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="border-gray-300"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==========================
// Loading Wrapper Hook
// ==========================

interface UseLoadingState {
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  startLoading: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  setOffline: (offline: boolean) => void;
}

export function useLoadingState(): UseLoadingState & { reset: () => void } {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setIsOffline(false);
  };

  return {
    isLoading,
    error,
    isOffline,
    startLoading: () => setIsLoading(true),
    setError: (err: string) => {
      setError(err);
      setIsLoading(false);
    },
    clearError: () => setError(null),
    setOffline: setIsOffline,
    reset,
  };
}

// ==========================
// Utility Components
// ==========================

interface LoadingWrapperProps {
  isLoading: boolean;
  error?: string | null;
  isOffline?: boolean;
  onRetry?: () => void;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  offlineComponent?: ReactNode;
  children: ReactNode;
}

export function LoadingWrapper({
  isLoading,
  error,
  isOffline = false,
  onRetry,
  loadingComponent,
  errorComponent,
  offlineComponent,
  children,
}: LoadingWrapperProps) {
  if (isLoading) {
    return loadingComponent || <EventListSkeleton />;
  }

  if (isOffline) {
    return offlineComponent || <OfflineIndicator onRetry={onRetry} />;
  }

  if (error) {
    return (
      errorComponent || (
        <ErrorMessage
          message={error}
          onRetry={onRetry}
        />
      )
    );
  }

  return <>{children}</>;
}

// ==========================
// Export all components
// ==========================

export default {
  EventListSkeleton,
  EventCardSkeleton,
  EventDetailSkeleton,
  RegistrationFormSkeleton,
  CalendarLoadingSkeleton,
  ErrorMessage,
  OfflineIndicator,
  EventErrorBoundary,
  useLoadingState,
  LoadingWrapper,
};