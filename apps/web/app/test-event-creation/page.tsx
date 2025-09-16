'use client';

import { EventCreationForm } from '../../components/events/EventCreationForm';

export default function TestEventCreationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Create New Event</h1>
      <EventCreationForm 
        communityId="test-community-id"
        onSuccess={() => {
          alert('Event created successfully!');
        }}
        onCancel={() => {
          alert('Event creation cancelled');
        }}
      />
    </div>
  );
}