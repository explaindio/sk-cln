import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
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
} from './EventLoadingStates';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={`card-header ${className}`}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      className={`button ${variant} ${size} ${className}`}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

// Test component for ErrorBoundary
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('EventLoadingStates', () => {
  describe('Skeleton Components', () => {
    it('renders EventCardSkeleton correctly', () => {
      render(<EventCardSkeleton />);
      
      // Check for skeleton elements
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      
      // Check for loading animation class
      const card = screen.getByRole('button').closest('.card');
      expect(card).toHaveClass('animate-pulse');
    });

    it('renders RegistrationFormSkeleton correctly', () => {
      render(<RegistrationFormSkeleton />);
      
      // Check for form field skeletons
      const card = screen.getByRole('button').closest('.card');
      expect(card).toHaveClass('animate-pulse');
    });

    it('renders CalendarLoadingSkeleton correctly', () => {
      render(<CalendarLoadingSkeleton />);
      
      // Check for calendar grid
      const card = screen.getByRole('button').closest('.card');
      expect(card).toHaveClass('animate-pulse');
    });

    it('renders EventDetailSkeleton correctly', () => {
      render(<EventDetailSkeleton />);
      
      // Check for detail skeleton structure
      const cards = screen.getAllByRole('button');
      expect(cards.length).toBeGreaterThan(0);
      
      cards.forEach(card => {
        expect(card.closest('.card')).toHaveClass('animate-pulse');
      });
    });

    it('renders EventListSkeleton with multiple cards', () => {
      render(<EventListSkeleton />);
      
      // Should render multiple skeleton cards
      const cards = screen.getAllByRole('button');
      expect(cards.length).toBeGreaterThan(1);
    });
  });

  describe('Error Components', () => {
    it('renders ErrorMessage with title and message', () => {
      const mockRetry = jest.fn();
      render(
        <ErrorMessage
          title="Test Error"
          message="This is a test error message"
          onRetry={mockRetry}
        />
      );
      
      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText('This is a test error message')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(
        <ErrorMessage
          message="Test error"
          onRetry={mockRetry}
        />
      );
      
      fireEvent.click(screen.getByText('Try Again'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('renders ErrorMessage without retry button when onRetry is not provided', () => {
      render(
        <ErrorMessage
          message="Test error without retry"
        />
      );
      
      expect(screen.getByText('Test error without retry')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('renders OfflineIndicator correctly', () => {
      const mockRetry = jest.fn();
      render(<OfflineIndicator onRetry={mockRetry} />);
      
      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.getByText('Check your connection and try again.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls onRetry when offline retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(<OfflineIndicator onRetry={mockRetry} />);
      
      fireEvent.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('EventErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <EventErrorBoundary>
          <div>Test content</div>
        </EventErrorBoundary>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders error UI when child component throws an error', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <EventErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EventErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('calls onError callback when error occurs', () => {
      const mockOnError = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <EventErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </EventErrorBoundary>
      );
      
      expect(mockOnError).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('recovers from error when Try Again is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { rerender } = render(
        <EventErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EventErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'));
      
      // Re-render with no error
      rerender(
        <EventErrorBoundary>
          <ThrowError shouldThrow={false} />
        </EventErrorBoundary>
      );
      
      // Should show the child content again
      expect(screen.getByText('No error')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('LoadingWrapper', () => {
    it('renders loading component when isLoading is true', () => {
      render(
        <LoadingWrapper isLoading={true} error={null}>
          <div>Content</div>
        </LoadingWrapper>
      );
      
      // Should show loading skeleton
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('renders error component when error is provided', () => {
      render(
        <LoadingWrapper isLoading={false} error="Test error">
          <div>Content</div>
        </LoadingWrapper>
      );
      
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('renders offline component when isOffline is true', () => {
      render(
        <LoadingWrapper isLoading={false} error={null} isOffline={true}>
          <div>Content</div>
        </LoadingWrapper>
      );
      
      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('renders children when no loading, error, or offline state', () => {
      render(
        <LoadingWrapper isLoading={false} error={null} isOffline={false}>
          <div>Actual content</div>
        </LoadingWrapper>
      );
      
      expect(screen.getByText('Actual content')).toBeInTheDocument();
    });

    it('uses custom loading component when provided', () => {
      const CustomLoading = () => <div>Custom loading...</div>;
      
      render(
        <LoadingWrapper 
          isLoading={true} 
          error={null}
          loadingComponent={<CustomLoading />}
        >
          <div>Content</div>
        </LoadingWrapper>
      );
      
      expect(screen.getByText('Custom loading...')).toBeInTheDocument();
    });

    it('uses custom error component when provided', () => {
      const CustomError = () => <div>Custom error!</div>;
      
      render(
        <LoadingWrapper 
          isLoading={false} 
          error="Test error"
          errorComponent={<CustomError />}
        >
          <div>Content</div>
        </LoadingWrapper>
      );
      
      expect(screen.getByText('Custom error!')).toBeInTheDocument();
    });
  });

  describe('useLoadingState Hook', () => {
    // Note: Testing React hooks requires @testing-library/react-hooks or rendering in a component
    function TestComponent() {
      const loadingState = useLoadingState();
      
      return (
        <div>
          <div data-testid="loading-status">{loadingState.isLoading ? 'loading' : 'not-loading'}</div>
          <div data-testid="error-status">{loadingState.error || 'no-error'}</div>
          <div data-testid="offline-status">{loadingState.isOffline ? 'offline' : 'online'}</div>
          <button onClick={loadingState.startLoading}>Start Loading</button>
          <button onClick={() => loadingState.setError('Test error')}>Set Error</button>
          <button onClick={loadingState.clearError}>Clear Error</button>
          <button onClick={() => loadingState.setOffline(true)}>Set Offline</button>
          <button onClick={loadingState.reset}>Reset</button>
        </div>
      );
    }

    it('manages loading state correctly', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
      
      fireEvent.click(screen.getByText('Start Loading'));
      expect(screen.getByTestId('loading-status')).toHaveTextContent('loading');
    });

    it('manages error state correctly', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('error-status')).toHaveTextContent('no-error');
      
      fireEvent.click(screen.getByText('Set Error'));
      expect(screen.getByTestId('error-status')).toHaveTextContent('Test error');
      expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading'); // Loading should stop when error is set
    });

    it('clears error state correctly', () => {
      render(<TestComponent />);
      
      fireEvent.click(screen.getByText('Set Error'));
      expect(screen.getByTestId('error-status')).toHaveTextContent('Test error');
      
      fireEvent.click(screen.getByText('Clear Error'));
      expect(screen.getByTestId('error-status')).toHaveTextContent('no-error');
    });

    it('manages offline state correctly', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('offline-status')).toHaveTextContent('online');
      
      fireEvent.click(screen.getByText('Set Offline'));
      expect(screen.getByTestId('offline-status')).toHaveTextContent('offline');
    });

    it('resets all states correctly', () => {
      render(<TestComponent />);
      
      // Set various states
      fireEvent.click(screen.getByText('Start Loading'));
      fireEvent.click(screen.getByText('Set Error'));
      fireEvent.click(screen.getByText('Set Offline'));
      
      // Verify states are set
      expect(screen.getByTestId('loading-status')).toHaveTextContent('loading');
      expect(screen.getByTestId('error-status')).toHaveTextContent('Test error');
      expect(screen.getByTestId('offline-status')).toHaveTextContent('offline');
      
      // Reset
      fireEvent.click(screen.getByText('Reset'));
      
      // Verify all states are reset
      expect(screen.getByTestId('loading-status')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('error-status')).toHaveTextContent('no-error');
      expect(screen.getByTestId('offline-status')).toHaveTextContent('online');
    });
  });
});

// Integration test example
describe('EventLoadingStates Integration', () => {
  it('provides a complete loading and error handling solution', () => {
    const mockRetry = jest.fn();
    
    function IntegrationTest() {
      const { isLoading, error, startLoading, setError, clearError } = useLoadingState();
      
      return (
        <div>
          <LoadingWrapper
            isLoading={isLoading}
            error={error}
            onRetry={mockRetry}
          >
            <div>Event content loaded successfully!</div>
          </LoadingWrapper>
          
          <button onClick={startLoading}>Load Events</button>
          <button onClick={() => setError('Failed to load events')}>Simulate Error</button>
          <button onClick={clearError}>Clear Error</button>
        </div>
      );
    }
    
    render(<IntegrationTest />);
    
    // Initially shows content
    expect(screen.getByText('Event content loaded successfully!')).toBeInTheDocument();
    
    // Start loading
    fireEvent.click(screen.getByText('Load Events'));
    expect(screen.queryByText('Event content loaded successfully!')).not.toBeInTheDocument();
    
    // Wait for loading to complete (in real app, this would be handled by async operation)
    waitFor(() => {
      expect(screen.getByText('Event content loaded successfully!')).toBeInTheDocument();
    });
    
    // Simulate error
    fireEvent.click(screen.getByText('Simulate Error'));
    expect(screen.queryByText('Event content loaded successfully!')).not.toBeInTheDocument();
    expect(screen.getByText('Failed to load events')).toBeInTheDocument();
    
    // Test retry functionality
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockRetry).toHaveBeenCalled();
    
    // Clear error
    fireEvent.click(screen.getByText('Clear Error'));
    expect(screen.getByText('Event content loaded successfully!')).toBeInTheDocument();
  });
});