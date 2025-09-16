'use client';

import { useState } from 'react';
import { useEvent, useRegisterForEvent, useCancelRegistration } from '../../../../../../../hooks/useEvents';
import { Button } from '../../../../../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../../../components/ui/Card';
import { Loading } from '../../../../../../../components/ui/Loading';
import { RichTextEditor } from '../../../../../../../components/editor/RichTextEditor';
import EventRegistration from '../../../../../../../components/events/EventRegistration';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  DollarSign,
  Share2,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface EventDetailPageProps {
  params: {
    slug: string;
    eventId: string;
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { data: event, isLoading } = useEvent(params.eventId);
  const registerForEvent = useRegisterForEvent();
  const cancelRegistration = useCancelRegistration();
  const [showAttendees, setShowAttendees] = useState(false);

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  const isPast = new Date(event.startDate) < new Date();
  const isFull = event.capacity && event.attendees && event.attendees.length >= event.capacity;
  const isRegistered = event.attendees && event.attendees.some(a => a.status === 'REGISTERED');
  const isWaitlisted = event.attendees && event.attendees.some(a => a.status === 'WAITLISTED');

  const handleCancel = async () => {
    await cancelRegistration.mutateAsync(params.eventId);
  };

  const handleShare = () => {
    navigator.share({
      title: event.title,
      text: event.description,
      url: window.location.href,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Event Banner */}
      {event.thumbnail && (
        <div className="aspect-video relative mb-6 rounded-lg overflow-hidden">
          <Image
            src={event.thumbnail}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Event Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span>Hosted by {event.organizer?.name}</span>
                  {isPast && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                      Past Event
                    </span>
                  )}
                </div>
              </div>

              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(event.startDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(event.startDate), 'h:mm a')} -
                      {format(new Date(event.endDate), 'h:mm a')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  {event.isOnline ? (
                    <>
                      <Video className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Online Event</p>
                        {isRegistered && event.meetingUrl && (
                          <a
                            href={event.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline"
                          >
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-gray-600">
                          {event.location}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Price</p>
                    <p className="text-sm text-gray-600">
                      {event.price > 0 ? `$${event.price}` : 'Free'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this Event</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor content={event.description} editable={false} />
            </CardContent>
          </Card>

          {/* Attendees */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Attendees ({event.attendees?.length || 0}
                  {event.capacity && `/${event.capacity}`})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAttendees(!showAttendees)}
                >
                  {showAttendees ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showAttendees && (
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {event.attendees?.map((attendee) => (
                    <div key={attendee.id} className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="text-sm truncate">Attendee</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Registration Sidebar */}
        <div>
          <EventRegistration
            event={event}
            isRegistered={isRegistered}
            isWaitlisted={isWaitlisted}
            onRegister={async (registrationData) => {
              // Handle the comprehensive registration data
              console.log('Registration data:', registrationData);
              await registerForEvent.mutateAsync(event.id);
            }}
            onCancel={onCancel}
            isLoading={registerForEvent.isPending || cancelRegistration.isPending}
          />
        </div>
      </div>
    </div>
  );
}