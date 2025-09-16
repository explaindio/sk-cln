'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Loading } from '../ui/Loading';
import { CheckCircle, Users, AlertCircle, DollarSign, Calendar, Clock, MapPin, Video } from 'lucide-react';
import { format } from 'date-fns';

interface GuestInfo {
  name: string;
  email: string;
  dietaryRestrictions: string;
}

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dietaryRestrictions: string;
  allergies: string;
  specialRequirements: string;
  guestCount: number;
  guests: GuestInfo[];
  acceptTerms: boolean;
  paymentMethod?: 'card' | 'paypal' | 'bank_transfer';
}

interface EventRegistrationProps {
  event: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    location?: string;
    isOnline: boolean;
    meetingUrl?: string;
    price: number;
    currency: string;
    capacity?: number;
    thumbnail?: string;
    waitlistEnabled: boolean;
    registrationDeadline?: string;
    attendees?: Array<{
      id: string;
      userId: string;
      eventId: string;
      status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
    }>;
  };
  isRegistered?: boolean;
  isWaitlisted?: boolean;
  onRegister: (data: RegistrationFormData) => Promise<void>;
  onCancel?: () => Promise<void>;
  isLoading?: boolean;
}

export default function EventRegistration({
  event,
  isRegistered = false,
  isWaitlisted = false,
  onRegister,
  onCancel,
  isLoading = false,
}: EventRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'payment' | 'confirmation'>('form');
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dietaryRestrictions: '',
    allergies: '',
    specialRequirements: '',
    guestCount: 0,
    guests: [],
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegistrationFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFull = event.capacity && event.attendees && event.attendees.length >= event.capacity;
  const spotsLeft = event.capacity ? event.capacity - (event.attendees?.length || 0) : undefined;
  const isPastEvent = new Date(event.startDate) < new Date();
  const isRegistrationClosed = event.registrationDeadline && new Date(event.registrationDeadline) < new Date();

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegistrationFormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    // Validate guest information
    if (formData.guestCount > 0) {
      formData.guests.forEach((guest, index) => {
        if (!guest.name.trim()) {
          newErrors.guests = `Guest ${index + 1} name is required`;
        }
        if (!guest.email.trim() || !/\S+@\S+\.\S+/.test(guest.email)) {
          newErrors.guests = `Guest ${index + 1} email is invalid`;
        }
      });
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegistrationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleGuestCountChange = (count: number) => {
    const newGuests = Array.from({ length: count }, (_, i) => 
      formData.guests[i] || { name: '', email: '', dietaryRestrictions: '' }
    );
    setFormData(prev => ({ ...prev, guestCount: count, guests: newGuests }));
  };

  const handleGuestChange = (index: number, field: keyof GuestInfo, value: string) => {
    const newGuests = [...formData.guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setFormData(prev => ({ ...prev, guests: newGuests }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (event.price > 0) {
        setCurrentStep('payment');
      } else {
        await onRegister(formData);
        setCurrentStep('confirmation');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onRegister(formData);
      setCurrentStep('confirmation');
    } catch (error) {
      console.error('Payment failed:', error);
      setErrors({ submit: 'Payment failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEventInfo = () => (
    <div className="space-y-4 mb-6">
      <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100">
        {event.thumbnail ? (
          <img
            src={event.thumbnail}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-3">{event.description}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span>{format(new Date(event.startDate), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span>{format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}</span>
        </div>
        <div className="flex items-center space-x-2">
          {event.isOnline ? (
            <>
              <Video className="h-4 w-4 text-gray-500" />
              <span>Online Event</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>{event.location || 'Location TBD'}</span>
            </>
          )}
        </div>
        {event.price > 0 && (
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span>{event.currency} {event.price}</span>
          </div>
        )}
      </div>

      {spotsLeft !== undefined && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {spotsLeft} spots left
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderRegistrationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderEventInfo()}

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Attendee Information</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            placeholder="Enter your first name"
            required
          />
          <Input
            label="Last Name *"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            error={errors.lastName}
            placeholder="Enter your last name"
            required
          />
        </div>

        <Input
          label="Email Address *"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={errors.email}
          placeholder="Enter your email address"
          required
        />

        <Input
          label="Phone Number *"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          error={errors.phone}
          placeholder="Enter your phone number"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dietary Restrictions
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={formData.dietaryRestrictions}
            onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
            placeholder="Please list any dietary restrictions or preferences..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allergies
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={formData.allergies}
            onChange={(e) => handleInputChange('allergies', e.target.value)}
            placeholder="Please list any allergies we should be aware of..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Requirements
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={formData.specialRequirements}
            onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
            placeholder="Any special requirements or accessibility needs..."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Guest Registration</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Guests
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={formData.guestCount}
            onChange={(e) => handleGuestCountChange(Number(e.target.value))}
          >
            <option value={0}>No guests</option>
            <option value={1}>1 guest</option>
            <option value={2}>2 guests</option>
            <option value={3}>3 guests</option>
            <option value={4}>4 guests</option>
          </select>
        </div>

        {formData.guestCount > 0 && (
          <div className="space-y-4">
            {formData.guests.map((guest, index) => (
              <Card key={index} className="p-4">
                <h5 className="font-medium text-gray-900 mb-3">Guest {index + 1}</h5>
                <div className="space-y-3">
                  <Input
                    label="Guest Name *"
                    value={guest.name}
                    onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                    placeholder="Enter guest name"
                    required
                  />
                  <Input
                    label="Guest Email *"
                    type="email"
                    value={guest.email}
                    onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
                    placeholder="Enter guest email"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dietary Restrictions
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      value={guest.dietaryRestrictions}
                      onChange={(e) => handleGuestChange(index, 'dietaryRestrictions', e.target.value)}
                      placeholder="Any dietary restrictions for this guest..."
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms"
            checked={formData.acceptTerms}
            onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-1">
            <label htmlFor="terms" className="text-sm text-gray-700">
              I accept the terms and conditions and understand the cancellation policy *
            </label>
            {errors.acceptTerms && (
              <p className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>
            )}
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{errors.submit}</span>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="flex-1"
        >
          {event.price > 0 ? 'Continue to Payment' : 'Register for Event'}
        </Button>
      </div>
    </form>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      {renderEventInfo()}

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Event Registration</span>
              <span className="font-bold">{event.currency} {event.price}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Payment Method</h4>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={formData.paymentMethod === 'card'}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">Credit/Debit Card</span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paypal"
                  checked={formData.paymentMethod === 'paypal'}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">PayPal</span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Card Number"
              placeholder="1234 5678 9012 3456"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Date"
                placeholder="MM/YY"
                required
              />
              <Input
                label="CVV"
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('form')}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Complete Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Registration Confirmed!
          </h3>
          <p className="text-gray-600">
            Thank you for registering for {event.title}. We've sent a confirmation email to {formData.email}.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{formData.firstName} {formData.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Guests:</span>
            <span className="font-medium">{formData.guestCount}</span>
          </div>
          {event.price > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Total Paid:</span>
              <span className="font-medium">{event.currency} {event.price * (1 + formData.guestCount)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {event.isOnline && event.meetingUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-3">
            This is an online event. You can join using the link below:
          </p>
          <a
            href={event.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Video className="h-4 w-4 mr-2" />
            Join Event
          </a>
        </div>
      )}

      <Button onClick={() => setCurrentStep('form')} variant="outline">
        Register Another Person
      </Button>
    </div>
  );

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  if (isPastEvent) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">This event has already ended</p>
        </CardContent>
      </Card>
    );
  }

  if (isRegistrationClosed) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Registration for this event has closed</p>
        </CardContent>
      </Card>
    );
  }

  if (isRegistered) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="font-medium text-green-600">You're already registered!</p>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full"
              >
                Cancel Registration
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isWaitlisted) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
            <p className="font-medium text-yellow-600">You're on the waitlist</p>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full"
              >
                Leave Waitlist
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isFull && !event.waitlistEnabled) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">This event is full</p>
          {spotsLeft !== undefined && (
            <p className="text-sm text-gray-600 mt-1">
              {event.capacity} attendees maximum capacity reached
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isFull && event.waitlistEnabled ? 'Join Waitlist' : 'Event Registration'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentStep === 'form' && renderRegistrationForm()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'confirmation' && renderConfirmation()}
      </CardContent>
    </Card>
  );
}