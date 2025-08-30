'use client';

import { useState } from 'react';
import { useCreateEvent, useUpdateEvent } from '../../hooks/useEvents';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ImageUpload } from '../upload/ImageUpload';
import { RichTextEditor } from '../editor/RichTextEditor';
import { Calendar, Clock, MapPin, Video, Users, DollarSign } from 'lucide-react';
import { addDays, addMonths } from 'date-fns';

interface Event {
  id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isOnline: boolean;
  location?: string;
  meetingUrl?: string;
  capacity?: number;
  price: number;
  thumbnail?: string;
  communityId: string;
}

interface EventFormProps {
  initialData?: Event;
  communityId: string;
  onSuccess?: (event: Event) => void;
}

export function EventForm({ initialData, communityId, onSuccess }: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [isOnline, setIsOnline] = useState(initialData?.isOnline || false);
  const [location, setLocation] = useState(initialData?.location || '');
  const [meetingUrl, setMeetingUrl] = useState(initialData?.meetingUrl || '');
  const [capacity, setCapacity] = useState(initialData?.capacity || '');
  const [price, setPrice] = useState(initialData?.price || 0);
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringCount, setRecurringCount] = useState(4); // How many recurrences

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const generateRecurringDates = (
    start: Date,
    pattern: string,
    count: number
  ): Date[] => {
    const dates = [start];
    let currentDate = new Date(start);

    for (let i = 1; i < count; i++) {
      switch (pattern) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addDays(currentDate, 7);
          break;
        case 'biweekly':
          currentDate = addDays(currentDate, 14);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
      }
      dates.push(new Date(currentDate));
    }
    return dates;
  };

  const handleSubmit = async () => {
    const baseEventData = {
      title,
      description,
      isOnline,
      location: !isOnline ? location : undefined,
      meetingUrl: isOnline ? meetingUrl : undefined,
      capacity: capacity ? parseInt(capacity) : undefined,
      price,
      thumbnail,
      communityId,
    };

    if (isRecurring) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      const duration = endDateTime.getTime() - startDateTime.getTime();

      const recurringDates = generateRecurringDates(startDateTime, recurringPattern, recurringCount);

      for (const date of recurringDates) {
        const recurringEventData = {
          ...baseEventData,
          startDate: date.toISOString(),
          endDate: new Date(date.getTime() + duration).toISOString(),
        };
        // In a real scenario, you might want to create these as a batch
        await createEvent.mutateAsync(recurringEventData);
      }
      onSuccess?.({}); // Indicate success for the batch
    } else {
      const eventData = {
        ...baseEventData,
        startDate: new Date(`${startDate}T${startTime}`).toISOString(),
        endDate: new Date(`${endDate}T${endTime}`).toISOString(),
      };

      if (initialData) {
        const result = await updateEvent.mutateAsync({
          eventId: initialData.id,
          data: eventData,
        });
        onSuccess?.(result);
      } else {
        const result = await createEvent.mutateAsync(eventData);
        onSuccess?.(result);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter event title"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Describe your event..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Banner</label>
            <ImageUpload currentImage={thumbnail} onUpload={setThumbnail} aspectRatio="16:9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="h-4 w-4 inline mr-1" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="h-4 w-4 inline mr-1" />
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="recurring" className="text-sm font-medium">
              This is a recurring event
            </label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repeat Pattern
                </label>
                <select
                  value={recurringPattern}
                  onChange={(e) => setRecurringPattern(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Occurrences
                </label>
                <input
                  type="number"
                  value={recurringCount}
                  onChange={(e) => setRecurringCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={!isOnline}
                onChange={() => setIsOnline(false)}
                className="mr-2"
              />
              <MapPin className="h-4 w-4 mr-1" />
              In-Person
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                checked={isOnline}
                onChange={() => setIsOnline(true)}
                className="mr-2"
              />
              <Video className="h-4 w-4 mr-1" />
              Online
            </label>
          </div>

          {isOnline ? (
            <Input
              label="Meeting URL"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/..."
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue/Address</label>
              <textarea
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter the event location..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="h-4 w-4 inline mr-1" />
                Capacity (optional)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Ticket Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="0 for free"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button variant="outline">Save as Draft</Button>
        <Button onClick={handleSubmit} isLoading={createEvent.isPending || updateEvent.isPending}>
          {initialData ? 'Update Event' : 'Publish Event'}
        </Button>
      </div>
    </div>
  );
}
