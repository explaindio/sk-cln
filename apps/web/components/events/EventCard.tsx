'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/Card';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  DollarSign,
  CheckCircle
} from 'lucide-react';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    location?: string;
    isOnline: boolean;
    thumbnail?: string;
    capacity?: number;
    attendeeCount: number;
    price: number;
    currency: string;
    isRegistered?: boolean;
    organizer: {
      name: string;
      avatar?: string;
    };
  };
  communitySlug: string;
}

export function EventCard({ event, communitySlug }: EventCardProps) {
  const isFull = event.capacity && event.attendeeCount >= event.capacity;
  const isPast = new Date(event.startDate) < new Date();

  return (
    <Link href={`/communities/${communitySlug}/events/${event.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative aspect-video bg-gray-200">
          {event.thumbnail ? (
            <Image
              src={event.thumbnail}
              alt={event.title}
              fill
              className="object-cover rounded-t-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {event.isRegistered && (
            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Registered
            </div>
          )}

          {isPast && (
            <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded">
              Past Event
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="text-primary-600 text-sm font-medium">
              {format(new Date(event.startDate), 'MMM d, yyyy')}
            </div>
            {event.price > 0 ? (
              <div className="flex items-center text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                {event.price}
              </div>
            ) : (
              <span className="text-green-600 text-sm font-medium">FREE</span>
            )}
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {event.title}
          </h3>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {event.description}
          </p>

          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {format(new Date(event.startDate), 'h:mm a')}
            </div>

            <div className="flex items-center">
              {event.isOnline ? (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Online Event
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location || 'Location TBA'}
                </>
              )}
            </div>

            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              {event.capacity ? (
                <span className={isFull ? 'text-red-600 font-medium' : ''}>
                  {event.attendeeCount}/{event.capacity} attendees
                  {isFull && ' (FULL)'}
                </span>
              ) : (
                <span>{event.attendeeCount} attendees</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-3 mt-3 border-t border-gray-100">
            {event.organizer.avatar ? (
              <Image
                src={event.organizer.avatar}
                alt={event.organizer.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
            )}
            <span className="text-sm text-gray-600">
              {event.organizer.name}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}