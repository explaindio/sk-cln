'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  DollarSign,
  CheckCircle,
  Map,
  Clock as ClockIcon
} from 'lucide-react';
import { Event } from '../../hooks/useEvents'; // Adjust path if needed

interface EventCardProps {
  event: Event;
  isRegistered?: boolean;
  onRSVP?: (eventId: string) => Promise<void>;
  communitySlug: string;
  registrationDeadline?: string; // Optional for countdown
}

export function EventCard({ 
  event, 
  isRegistered = false, 
  onRSVP, 
  communitySlug, 
  registrationDeadline 
}: EventCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const attendeeCount = event.attendees?.length || 0;
  const isFull = event.capacity && attendeeCount >= event.capacity;
  const eventStart = new Date(event.startDate);
  const isPastEvent = isPast(eventStart);
  const deadlineDate = registrationDeadline ? new Date(registrationDeadline) : null;
  const daysLeft = deadlineDate ? differenceInDays(deadlineDate, new Date()) : null;

  const handleRSVP = async () => {
    if (!onRSVP || isLoading || isFull || isPastEvent) return;
    setIsLoading(true);
    try {
      await onRSVP(event.id);
    } catch (error) {
      console.error('RSVP failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMapUrl = () => {
    if (event.isOnline || !event.location) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg border-0 bg-white">
      {/* Header with Image */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
        {event.thumbnail ? (
          <Image
            src={event.thumbnail}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-100">
            <Calendar className="h-12 w-12 text-blue-500" />
          </div>
        )}

        {/* RSVP Status Badge */}
        {isRegistered && (
          <Badge className="absolute top-3 right-3 bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Registered
          </Badge>
        )}

        {/* Past Event Badge */}
        {isPastEvent && (
          <Badge className="absolute top-3 left-3 bg-gray-100 text-gray-800 border-gray-200">
            Past Event
          </Badge>
        )}

        {/* Deadline Badge */}
        {daysLeft !== null && daysLeft >= 0 && (
          <Badge 
            className={`absolute bottom-3 left-3 ${
              daysLeft <= 3 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
            }`}
          >
            <ClockIcon className="h-3 w-3 mr-1" />
            {daysLeft === 0 ? 'Today' : `${daysLeft} days left`}
          </Badge>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        <CardHeader className="p-0 mb-3">
          {/* Date and Price */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-900">
              {format(eventStart, 'MMM dd, yyyy')}
            </div>
            <div className="flex items-center space-x-1">
              {event.price > 0 ? (
                <>
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">{event.currency} {event.price}</span>
                </>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">Free</Badge>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight">
            {event.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {event.description}
          </p>
        </CardHeader>

        {/* Event Details */}
        <div className="space-y-2 mb-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            <span>{format(eventStart, 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}</span>
          </div>

          <div className="flex items-center">
            {event.isOnline ? (
              <>
                <Video className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-blue-600 font-medium">Online • {event.meetingUrl ? 'Zoom Link Available' : 'Virtual Event'}</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                {getMapUrl() ? (
                  <a
                    href={getMapUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {event.location}
                  </a>
                ) : (
                  <span>{event.location || 'Location TBD'}</span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-gray-400" />
            <span className={`font-medium ${isFull ? 'text-red-600' : 'text-gray-900'}`}>
              {attendeeCount} {event.capacity ? `/${event.capacity}` : ''} attendees
              {isFull && ' • Full'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            asChild 
            variant="outline" 
            className="flex-1"
            disabled={isPastEvent}
          >
            <Link href={`/communities/${communitySlug}/events/${event.id}`}>
              View Details
            </Link>
          </Button>

          {onRSVP && !isRegistered && !isPastEvent && (
            <Button 
              onClick={handleRSVP} 
              disabled={isLoading || isFull} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              variant="default"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span>
                  Processing...
                </>
              ) : isFull ? (
                'Full'
              ) : (
                'RSVP Now'
              )}
            </Button>
          )}

          {isRegistered && (
            <Button 
              variant="secondary" 
              disabled={isPastEvent}
              className="flex-1"
            >
              Registered
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}