import React, { useState } from 'react';
import { Event } from '../../../types/event'; // Assuming Event type is defined elsewhere
import { Calendar, Clock, MapPin, Users, CheckCircle, X } from 'lucide-react';
import { format, isPast } from 'date-fns';

// Assuming these components exist or are imported from existing codebase
// If not, they would need to be created or adapted
import EventCard from './EventCard';
import CalendarView from './CalendarView';
import EventRegistration from './EventRegistration';

// Simple touch swipe detection hook (custom implementation for RSVP)
const useSwipe = (onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
};

interface MobileEventInterfaceProps {
  events: Event[];
  communitySlug?: string;
  onRSVP?: (eventId: string) => Promise<void>;
  onRegister?: (eventId: string, data: any) => Promise<void>;
  view?: 'list' | 'calendar'; // Reusable for different contexts
}

const MobileEventInterface: React.FC<MobileEventInterfaceProps> = ({
  events,
  communitySlug,
  onRSVP,
  onRegister,
  view = 'list',
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleRSVP = async (eventId: string) => {
    if (onRSVP) {
      await onRSVP(eventId);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowRegistration(true);
  };

  const closeRegistration = () => {
    setShowRegistration(false);
    setSelectedEvent(null);
  };

  // Simplified mobile calendar - basic month view with events
  const SimplifiedMobileCalendar = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <button className="text-gray-500 hover:text-gray-700">
          <Calendar className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold">October 2025</h3>
        <button className="text-gray-500 hover:text-gray-700">Today</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
          <div key={day} className="text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        {/* Sample days - in real impl, use date-fns to generate */}
        {Array.from({ length: 31 }, (_, i) => (
          <button
            key={i}
            className={`p-2 rounded text-sm min-h-[40px] ${
              i % 7 === 0 ? 'text-gray-500' : 'text-gray-900'
            } ${i < 10 ? 'bg-gray-50' : ''}`}
            onClick={() => {}}
          >
            {i + 1}
            {events.some((e) => new Date(e.startDate).getDate() === i + 1) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Touch-friendly date picker - using native input for simplicity
  const MobileDatePicker = ({ onDateSelect }: { onDateSelect: (date: string) => void }) => (
    <div className="relative">
      <input
        type="date"
        onChange={(e) => onDateSelect(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:border-black focus:outline-none bg-white"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <button className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <Users className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-2 mb-4">
        <button
          className={`flex-1 p-3 rounded-lg border ${
            view === 'list'
              ? 'border-black bg-black text-white'
              : 'border-gray-300 text-gray-700 bg-white'
          }`}
          onClick={() => {}}
        >
          List
        </button>
        <button
          className={`flex-1 p-3 rounded-lg border ${
            view === 'calendar'
              ? 'border-black bg-black text-white'
              : 'border-gray-300 text-gray-700 bg-white'
          }`}
          onClick={() => {}}
        >
          Calendar
        </button>
      </div>

      {view === 'list' ? (
        <div className="space-y-4">
          {events.map((event) => {
            const isPastEvent = isPast(new Date(event.startDate));
            const handleSwipeLeft = () => handleRSVP(event.id); // RSVP on left swipe

            const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(
              handleSwipeLeft,
              undefined // Right swipe could cancel or something else
            );

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Swipe feedback overlay */}
                <div className="absolute inset-0 bg-green-500 opacity-0 transition-opacity flex items-center justify-start pl-4 pointer-events-none">
                  <CheckCircle className="h-6 w-6 text-white" />
                  <span className="ml-2 text-white font-medium">RSVP</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                      {event.title}
                    </h3>
                    <div className="flex-shrink-0">
                      {!isPastEvent ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Upcoming
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Past
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm mb-2">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{format(new Date(event.startDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm mb-3">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{format(new Date(event.startDate), 'h:mm a')}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center text-gray-600 text-sm mb-4">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600 text-sm">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{event.attendees?.length || 0} attending</span>
                    </div>
                    <button
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 min-w-[80px]"
                      onClick={() => handleEventClick(event)}
                      disabled={isPastEvent}
                    >
                      {isPastEvent ? 'Past' : 'Details'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <SimplifiedMobileCalendar />
      )}

      {/* Mobile Registration Modal - Bottom Sheet Style */}
      {showRegistration && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl p-4 w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Register for {selectedEvent.title}</h2>
              <button onClick={closeRegistration} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <EventRegistration
              event={selectedEvent}
              onRegister={async (data) => {
                if (onRegister) await onRegister(selectedEvent.id, data);
                closeRegistration();
              }}
              onCancel={closeRegistration}
              isLoading={false}
            />
          </div>
        </div>
      )}

      {/* Touch-friendly date selection example - can be integrated */}
      {/* <MobileDatePicker onDateSelect={(date) => console.log(date)} /> */}
    </div>
  );
};

export default MobileEventInterface;