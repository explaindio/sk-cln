import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventRegistration from './EventRegistration';

// Mock event data
const mockEvent = {
  id: 'test-event-123',
  title: 'Test Community Event',
  description: 'This is a test event for the community',
  startDate: '2024-12-25T10:00:00Z',
  endDate: '2024-12-25T14:00:00Z',
  location: 'Community Center',
  isOnline: false,
  price: 25,
  currency: 'USD',
  capacity: 50,
  thumbnail: '/test-image.jpg',
  waitlistEnabled: true,
  registrationDeadline: '2024-12-20T23:59:59Z',
  attendees: [],
  organizer: {
    id: 'organizer-123',
    name: 'Event Organizer',
  },
};

const mockOnRegister = jest.fn();
const mockOnCancel = jest.fn();

describe('EventRegistration Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders event information correctly', () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Test Community Event')).toBeInTheDocument();
    expect(screen.getByText('This is a test event for the community')).toBeInTheDocument();
    expect(screen.getByText('USD 25')).toBeInTheDocument();
  });

  test('shows registration form with all required fields', () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number *')).toBeInTheDocument();
  });

  test('shows dietary restrictions and allergies fields', () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('Dietary Restrictions')).toBeInTheDocument();
    expect(screen.getByLabelText('Allergies')).toBeInTheDocument();
    expect(screen.getByLabelText('Special Requirements')).toBeInTheDocument();
  });

  test('shows guest registration options', () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('Number of Guests')).toBeInTheDocument();
  });

  test('shows terms acceptance checkbox', () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/I accept the terms and conditions/)).toBeInTheDocument();
  });

  test('validates required fields on submit', async () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Continue to Payment/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    });
  });

  test('shows waitlist option when event is full', () => {
    const fullEvent = {
      ...mockEvent,
      capacity: 2,
      attendees: [
        { id: '1', userId: 'user1', eventId: 'test-event-123', status: 'REGISTERED' as const },
        { id: '2', userId: 'user2', eventId: 'test-event-123', status: 'REGISTERED' as const },
      ],
    };

    render(
      <EventRegistration
        event={fullEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
  });

  test('shows already registered message when user is registered', () => {
    render(
      <EventRegistration
        event={mockEvent}
        isRegistered={true}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("You're already registered!")).toBeInTheDocument();
  });

  test('shows waitlist confirmation when user is waitlisted', () => {
    render(
      <EventRegistration
        event={mockEvent}
        isWaitlisted={true}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("You're on the waitlist")).toBeInTheDocument();
  });

  test('shows past event message for ended events', () => {
    const pastEvent = {
      ...mockEvent,
      startDate: '2020-01-01T10:00:00Z',
      endDate: '2020-01-01T14:00:00Z',
    };

    render(
      <EventRegistration
        event={pastEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('This event has already ended')).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address *'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number *'), { target: { value: '123-456-7890' } });
    
    // Accept terms
    fireEvent.click(screen.getByLabelText(/I accept the terms and conditions/));

    const submitButton = screen.getByRole('button', { name: /Continue to Payment/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          acceptTerms: true,
        })
      );
    });
  });

  test('shows payment step for paid events', async () => {
    render(
      <EventRegistration
        event={mockEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address *'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number *'), { target: { value: '123-456-7890' } });
    
    // Accept terms
    fireEvent.click(screen.getByLabelText(/I accept the terms and conditions/));

    const submitButton = screen.getByRole('button', { name: /Continue to Payment/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });
  });

  test('shows free registration for free events', () => {
    const freeEvent = {
      ...mockEvent,
      price: 0,
    };

    render(
      <EventRegistration
        event={freeEvent}
        onRegister={mockOnRegister}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /Register for Event/ })).toBeInTheDocument();
  });
});