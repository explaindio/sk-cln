'use client';

import React from 'react';
import { AttendeeManagement } from './AttendeeManagement';

/**
 * Example usage of the AttendeeManagement component
 * This demonstrates how to integrate the attendee management interface
 * into your event management pages.
 */
export function AttendeeManagementExample() {
  // Example event data
  const exampleEvent = {
    id: 'event-123',
    title: 'Annual Tech Conference 2024',
    startTime: '2024-03-15T09:00:00Z',
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Event Management Dashboard
        </h1>
        <p className="text-gray-600">
          Manage your event attendees, track attendance, and handle event logistics
        </p>
      </div>

      {/* Event Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {exampleEvent.title}
            </h2>
            <p className="text-gray-600 mt-1">
              March 15, 2024 at 9:00 AM UTC
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Edit Event
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
              View Event
            </button>
          </div>
        </div>
      </div>

      {/* Attendee Management Component */}
      <AttendeeManagement
        eventId={exampleEvent.id}
        eventTitle={exampleEvent.title}
        eventStartTime={exampleEvent.startTime}
        className="mb-6"
      />

      {/* Additional Event Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Event Details
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="text-gray-900">Convention Center, Main Hall</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Capacity</label>
              <p className="text-gray-900">500 attendees</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Registration Deadline</label>
              <p className="text-gray-900">March 10, 2024</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              Send Event Reminders
            </button>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Generate Reports
            </button>
            <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors">
              Manage Waitlist
            </button>
          </div>
        </div>
      </div>

      {/* Integration Notes */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Integration Notes
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• The AttendeeManagement component automatically fetches attendee data for the specified event</li>
          <li>• Real-time updates are enabled with 30-second polling intervals</li>
          <li>• Export functionality supports CSV, Excel, PDF, and Print formats</li>
          <li>• Bulk messaging allows communication with selected attendees</li>
          <li>• Check-in codes can be generated and used for attendance tracking</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Usage Instructions:
 * 
 * 1. Import the AttendeeManagement component:
 *    import { AttendeeManagement } from '@/components/events/AttendeeManagement';
 * 
 * 2. Use in your event management page:
 *    <AttendeeManagement
 *      eventId={yourEventId}
 *      eventTitle={yourEventTitle}
 *      eventStartTime={yourEventStartTime}
 *      className="optional-custom-class"
 *    />
 * 
 * 3. Required props:
 *    - eventId: Unique identifier for the event
 *    - eventTitle: Display title of the event
 *    - eventStartTime: ISO string of event start time
 * 
 * 4. Optional props:
 *    - className: Additional CSS classes for styling
 */