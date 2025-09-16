'use client';

import { useState } from 'react';
import EventRegistration from '../../../components/events/EventRegistration';

// Mock event data for testing
const testEvent = {
  id: 'test-event-123',
  title: 'Annual Community Gala',
  description: 'Join us for an evening of networking, dinner, and entertainment. This annual event brings together community members for a night of celebration and connection.',
  startDate: '2024-12-15T18:00:00Z',
  endDate: '2024-12-15T22:00:00Z',
  location: 'Grand Ballroom, City Center',
  isOnline: false,
  price: 75,
  currency: 'USD',
  capacity: 100,
  thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
  waitlistEnabled: true,
  registrationDeadline: '2024-12-10T23:59:59Z',
  attendees: [
    { id: '1', userId: 'user1', eventId: 'test-event-123', status: 'REGISTERED' as const },
    { id: '2', userId: 'user2', eventId: 'test-event-123', status: 'REGISTERED' as const },
  ],
  organizer: {
    id: 'organizer-123',
    name: 'Community Events Team',
  },
};

const freeEvent = {
  ...testEvent,
  id: 'free-event-123',
  title: 'Community Workshop',
  description: 'Free workshop on community building and engagement strategies.',
  price: 0,
  capacity: 50,
  attendees: [],
};

export default function TestRegistrationPage() {
  const [currentEvent, setCurrentEvent] = useState(testEvent);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (registrationData: any) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Registration data:', registrationData);
    
    // Simulate different scenarios
    if (currentEvent.capacity && currentEvent.attendees.length >= currentEvent.capacity) {
      setIsWaitlisted(true);
    } else {
      setIsRegistered(true);
    }
    
    setIsLoading(false);
  };

  const handleCancel = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsRegistered(false);
    setIsWaitlisted(false);
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Event Registration Test</h1>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => {
                setCurrentEvent(testEvent);
                setIsRegistered(false);
                setIsWaitlisted(false);
              }}
              className={`px-4 py-2 rounded-md ${
                currentEvent.id === testEvent.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Paid Event ($75)
            </button>
            
            <button
              onClick={() => {
                setCurrentEvent(freeEvent);
                setIsRegistered(false);
                setIsWaitlisted(false);
              }}
              className={`px-4 py-2 rounded-md ${
                currentEvent.id === freeEvent.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Free Event
            </button>
            
            <button
              onClick={() => {
                setCurrentEvent({
                  ...testEvent,
                  attendees: Array.from({ length: 100 }, (_, i) => ({
                    id: `attendee-${i}`,
                    userId: `user-${i}`,
                    eventId: testEvent.id,
                    status: 'REGISTERED' as const,
                  })),
                });
                setIsRegistered(false);
                setIsWaitlisted(false);
              }}
              className="px-4 py-2 rounded-md bg-white text-gray-700 border border-gray-300"
            >
              Full Event
            </button>
            
            <button
              onClick={() => {
                setIsRegistered(true);
                setIsWaitlisted(false);
              }}
              className="px-4 py-2 rounded-md bg-white text-gray-700 border border-gray-300"
            >
              Already Registered
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Event Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{currentEvent.title}</h3>
                  <p className="text-gray-600 mt-2">{currentEvent.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(currentEvent.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Time:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(currentEvent.startDate).toLocaleTimeString()} - {new Date(currentEvent.endDate).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    <span className="ml-2 text-gray-600">{currentEvent.location}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Price:</span>
                    <span className="ml-2 text-gray-600">
                      {currentEvent.price > 0 ? `$${currentEvent.price}` : 'Free'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Capacity:</span>
                  <span className="ml-2 text-gray-600">
                    {currentEvent.attendees?.length || 0} / {currentEvent.capacity} registered
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <EventRegistration
              event={currentEvent}
              isRegistered={isRegistered}
              isWaitlisted={isWaitlisted}
              onRegister={handleRegister}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Test Scenarios</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="font-medium text-gray-900">Paid Event:</span>
              <span>Tests payment flow with $75 registration fee</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-gray-900">Free Event:</span>
              <span>Tests registration without payment</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-gray-900">Full Event:</span>
              <span>Tests waitlist functionality when capacity is reached</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-medium text-gray-900">Already Registered:</span>
              <span>Shows registered state with cancel option</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}