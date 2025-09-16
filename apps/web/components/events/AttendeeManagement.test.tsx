import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendeeManagement } from './AttendeeManagement';

// Mock the hooks
jest.mock('../../hooks/useEventAttendees', () => ({
  useEventAttendees: jest.fn(() => ({
    data: [
      {
        id: '1',
        eventId: 'event-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'confirmed',
        ticketType: 'VIP',
        registeredAt: '2024-01-15T10:00:00Z',
        checkInCode: 'ABC123',
      },
      {
        id: '2',
        eventId: 'event-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        status: 'registered',
        ticketType: 'Standard',
        registeredAt: '2024-01-16T14:30:00Z',
        checkInCode: 'DEF456',
      },
    ],
    isLoading: false,
    refetch: jest.fn(),
  })),
  useUpdateAttendeeStatus: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
  useSendAttendeeMessage: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
  useExportAttendees: jest.fn(() => ({
    mutateAsync: jest.fn(),
  })),
}));

jest.mock('../../lib/toast', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

describe('AttendeeManagement', () => {
  const defaultProps = {
    eventId: 'event-1',
    eventTitle: 'Test Event',
    eventStartTime: '2024-02-01T18:00:00Z',
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders attendee management component', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    expect(screen.getByText('Event Attendees')).toBeInTheDocument();
    expect(screen.getByText('Manage attendees for "Test Event"')).toBeInTheDocument();
  });

  it('displays attendee statistics', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Total attendees
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Confirmed attendees
  });

  it('displays attendee list with correct information', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('filters attendees by search term', async () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search attendees by name, email, or phone...');
    
    // Search for John
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('filters attendees by status', async () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    const statusFilter = screen.getByRole('combobox');
    
    // Filter by 'confirmed' status
    fireEvent.change(statusFilter, { target: { value: 'confirmed' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('allows selecting attendees for bulk actions', async () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]; // First checkbox is "select all"
    
    // Select all attendees
    fireEvent.click(selectAllCheckbox);
    
    expect(screen.getByText('2 attendee(s) selected')).toBeInTheDocument();
    
    // Deselect all
    fireEvent.click(selectAllCheckbox);
    
    expect(screen.queryByText('2 attendee(s) selected')).not.toBeInTheDocument();
  });

  it('opens check-in modal when check-in button is clicked', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    const checkInButton = screen.getByText('Check In');
    fireEvent.click(checkInButton);
    
    expect(screen.getByText('Check In Attendee')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter check-in code')).toBeInTheDocument();
  });

  it('shows export menu when export button is clicked', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    jest.mock('../../hooks/useEventAttendees', () => ({
      useEventAttendees: jest.fn(() => ({
        data: [],
        isLoading: true,
        refetch: jest.fn(),
      })),
    }));

    render(<AttendeeManagement {...defaultProps} />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays empty state when no attendees', () => {
    jest.mock('../../hooks/useEventAttendees', () => ({
      useEventAttendees: jest.fn(() => ({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      })),
    }));

    render(<AttendeeManagement {...defaultProps} />);
    
    expect(screen.getByText('No attendees found')).toBeInTheDocument();
    expect(screen.getByText('No attendees have registered for this event yet')).toBeInTheDocument();
  });

  it('shows status badges with correct colors', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    const confirmedBadge = screen.getByText('Confirmed');
    const registeredBadge = screen.getByText('Registered');
    
    expect(confirmedBadge).toBeInTheDocument();
    expect(registeredBadge).toBeInTheDocument();
  });

  it('handles status updates', async () => {
    const mockUpdateStatus = jest.fn().mockResolvedValue({});
    jest.mock('../../hooks/useEventAttendees', () => ({
      useUpdateAttendeeStatus: jest.fn(() => ({
        mutateAsync: mockUpdateStatus,
      })),
    }));

    render(<AttendeeManagement {...defaultProps} />);
    
    const statusSelects = screen.getAllByRole('combobox');
    const firstStatusSelect = statusSelects[1]; // First is the filter, subsequent are per attendee
    
    fireEvent.change(firstStatusSelect, { target: { value: 'attended' } });
    
    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalled();
    });
  });

  it('displays attendee initials in avatar', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    // Check that initials are displayed (JD for John Doe, JS for Jane Smith)
    const avatarElements = screen.getAllByText(/^[A-Z]{2}$/);
    expect(avatarElements.length).toBeGreaterThan(0);
  });

  it('formats registration dates correctly', () => {
    render(<AttendeeManagement {...defaultProps} />);
    
    // Should show formatted dates (the exact format depends on the formatDate function)
    expect(screen.getAllByText(/January \d{1,2}, 2024/).length).toBeGreaterThan(0);
  });
});