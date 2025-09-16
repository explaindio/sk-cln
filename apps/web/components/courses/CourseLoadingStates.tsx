import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert'; // Assuming Alert exists; if not, use div with classes
import { Loader2, WifiOff, RefreshCw } from 'lucide-react'; // Icons for loading, offline, retry
import { cn } from '../../lib/utils';
import { toast } from 'sonner'; // Or use existing toast lib

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
);

export const CourseListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="h-48 bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const VideoPlayerSkeleton: React.FC = () => {
  return (
    <div className="bg-black rounded-lg overflow-hidden shadow-lg">
      <div className="w-full aspect-video bg-gray-800 animate-pulse flex items-center justify-center">
        <Loader2 className="h-16 w-16 text-gray-500 animate-spin" />
      </div>
      <div className="p-4 bg-gray-900 space-y-2">
        <Skeleton className="h-2 w-full" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    </div>
  );
};

export const ProgressBarSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-2', className)}>
      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: 'var(--width, 60%)' }} />
    </div>
  );
};

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
  className,
}) => {
  return (
    <div className={cn('max-w-md mx-auto text-center py-12', className)}>
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-red-600 animate-spin" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
};

interface OfflineIndicatorProps {
  isOffline: boolean;
  onRetry?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOffline, onRetry }) => {
  if (!isOffline) return null;

  return (
    <Alert className="border-red-200 bg-red-50 mb-4">
      <WifiOff className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-900">You're offline</AlertTitle>
      <AlertDescription className="text-red-700">
        You are currently offline. Some features may not work properly.
        {onRetry && (
          <Button variant="link" onClick={onRetry} size="sm" className="ml-2 p-0 h-auto">
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    toast.error('An unexpected error occurred. Please refresh the page.');
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorMessage
          title="An error occurred"
          message="Something went wrong while rendering this component."
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

// Usage example in hooks/pages:
// <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
//   <CourseListSkeleton if loading />
// </ErrorBoundary>
// <OfflineIndicator isOffline={!navigator.onLine} onRetry={refetch} />