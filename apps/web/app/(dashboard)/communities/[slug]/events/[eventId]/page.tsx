'use client';

import { useState } from 'react';
import { useEvent, useRegisterForEvent, useCancelRegistration } from '../../../../../../../hooks/useEvents';
import { Button } from '../../../../../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../../../components/ui/Card';
import { Loading } from '../../../../../../../components/ui/Loading';
import { RichTextEditor } from '../../../../../../../components/editor/RichTextEditor';
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
  const isFull = event.capacity && event.attendees.length >= event.capacity;
  const isRegistered = event.attendees.some(a => a.status === 'REGISTERED');
  const isWaitlisted = event.attendees.some(a => a.status === 'WAITLISTED');

  const handleRegister = async () => {
    await registerForEvent.mutateAsync(params.eventId);
  };

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
                  Attendees ({event.attendees.length}
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
                  {event.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center space-x-2">
                      {attendee.user.avatar ? (
                        <Image
                          src={attendee.user.avatar}
                          alt={attendee.user.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                      <span className="text-sm truncate">{attendee.user.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Registration Sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardContent className="p-6">
              {isPast ? (
                <div className="text-center">
                  <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">This event has ended</p>
                </div>
              ) : isRegistered ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <p className="font-medium text-green-600">You're registered!</p>
                  </div>

                  {event.isOnline && event.meetingUrl && (
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full">
                        <Video className="h-4 w-4 mr-2" />
                        Join Event
                      </Button>
                    </a>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    isLoading={cancelRegistration.isPending}
                    className="w-full"
                  >
                    Cancel Registration
                  </Button>
                </div>
              ) : isWaitlisted ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                    <p className="font-medium text-yellow-600">You're on the waitlist</p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    isLoading={cancelRegistration.isPending}
                    className="w-full"
                  >
                    Leave Waitlist
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {event.price > 0 ? `$${event.price}` : 'Free'}
                    </p>
                    {event.capacity && (
                      <p className="text-sm text-gray-600 mt-1">
                        {event.capacity - event.attendees.length} spots left
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleRegister}
                    isLoading={registerForEvent.isPending}
                    disabled={isFull && !event.waitlistEnabled}
                    className="w-full"
                  >
                    {isFull ? 'Join Waitlist' : event.price > 0 ? 'Register & Pay' : 'Register'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}