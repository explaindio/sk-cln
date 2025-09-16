# EventRegistration Component

A comprehensive event registration component that handles all aspects of event attendance registration, including attendee information collection, guest registration, dietary restrictions, payment processing, and confirmation flow.

## Features

### 🎯 Core Registration Features
- **Attendee Information Collection**: Name, email, phone number
- **Dietary Restrictions & Allergies**: Special dietary needs and allergy information
- **Guest Registration**: Add multiple guests with their information
- **Special Requirements**: Accessibility needs and special requests
- **Terms Acceptance**: Required terms and conditions acceptance

### 💳 Payment Integration
- **Paid Events**: Seamless payment processing for ticketed events
- **Free Events**: Streamlined registration without payment
- **Payment Methods**: Credit/debit card and PayPal support
- **Payment Confirmation**: Secure payment processing flow

### 📊 Capacity & Waitlist Management
- **Real-time Capacity**: Shows available spots
- **Waitlist Functionality**: Automatic waitlist when event is full
- **Registration Limits**: Prevents overbooking
- **Deadline Management**: Registration cutoff dates

### ✅ User Experience
- **Multi-step Flow**: Form → Payment → Confirmation
- **Form Validation**: Comprehensive input validation
- **Error Handling**: User-friendly error messages
- **Loading States**: Smooth loading indicators
- **Responsive Design**: Mobile-friendly interface

## Usage

### Basic Implementation

```tsx
import EventRegistration from '@/components/events/EventRegistration';

function EventDetailPage({ event }) {
  const registerForEvent = useRegisterForEvent();
  const cancelRegistration = useCancelRegistration();

  return (
    <EventRegistration
      event={event}
      isRegistered={false}
      isWaitlisted={false}
      onRegister={async (registrationData) => {
        // Handle registration with comprehensive data
        await registerForEvent.mutateAsync(event.id);
      }}
      onCancel={async () => {
        await cancelRegistration.mutateAsync(event.id);
      }}
      isLoading={registerForEvent.isPending}
    />
  );
}
```

### Event Data Structure

```typescript
interface Event {
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
  waitlistEnabled?: boolean;
  registrationDeadline?: string;
  attendees?: Array<{
    id: string;
    userId: string;
    eventId: string;
    status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
  }>;
  organizer?: {
    id: string;
    name: string;
    avatar?: string;
  };
}
```

### Registration Data Structure

```typescript
interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dietaryRestrictions: string;
  allergies: string;
  specialRequirements: string;
  guestCount: number;
  guests: Array<{
    name: string;
    email: string;
    dietaryRestrictions: string;
  }>;
  acceptTerms: boolean;
  paymentMethod?: 'card' | 'paypal' | 'bank_transfer';
}
```

## Component States

### 1. Registration Form
- Displays event information (title, date, time, location, price)
- Shows available capacity
- Collects attendee information
- Handles guest registration
- Includes dietary restrictions and special requirements
- Terms acceptance checkbox

### 2. Payment Step (for paid events)
- Shows registration summary
- Payment method selection
- Secure payment form
- Back navigation to form

### 3. Confirmation
- Success message
- Registration summary
- Event details and meeting link (if online)
- Option to register another person

### 4. Alternative States
- **Already Registered**: Shows registration status with cancel option
- **On Waitlist**: Shows waitlist status with leave option
- **Event Full**: Shows capacity reached message
- **Past Event**: Shows event ended message
- **Registration Closed**: Shows deadline passed message

## Validation

### Required Fields
- First Name
- Last Name
- Email (valid format)
- Phone Number
- Terms Acceptance

### Guest Validation
- Guest names (when guests are added)
- Guest emails (valid format)

### Form Validation Features
- Real-time validation feedback
- Error message display
- Field-specific validation
- Form submission prevention with errors

## Styling & Design

### Skool Design System Compliance
- Uses existing UI components (Button, Card, Input)
- Follows established color schemes and typography
- Consistent spacing and layout patterns
- Responsive design principles

### Visual Hierarchy
- Clear section headings
- Logical form grouping
- Intuitive navigation flow
- Professional appearance

## API Integration

### Event Hooks Integration
```typescript
// Updated event hooks in useEvents.ts
export function useRegisterForEvent() {
  // Handles basic registration
}

export function useCancelRegistration() {
  // Handles registration cancellation
}

export function useCompleteEventRegistration() {
  // Handles comprehensive registration with all data
}
```

### Registration Flow
1. **Form Submission**: Validates and processes registration data
2. **Payment Processing**: Handles payment for paid events
3. **API Call**: Sends registration data to backend
4. **Confirmation**: Shows success message and summary

## Error Handling

### Form Validation Errors
- Required field messages
- Email format validation
- Phone number validation
- Guest information validation

### API Errors
- Registration failure messages
- Payment processing errors
- Network error handling
- User-friendly error display

### Edge Cases
- Event capacity changes during registration
- Payment processing failures
- Network connectivity issues
- Concurrent registration attempts

## Testing

### Test Scenarios Covered
- ✅ Free event registration
- ✅ Paid event with payment flow
- ✅ Event at capacity (waitlist)
- ✅ Already registered state
- ✅ Waitlisted state
- ✅ Past event handling
- ✅ Registration deadline
- ✅ Form validation
- ✅ Guest registration
- ✅ Error handling

### Test File
`EventRegistration.test.tsx` - Comprehensive test suite with 13 test cases covering all major functionality.

## Performance Considerations

### Optimization Features
- Lazy loading of payment components
- Efficient form state management
- Minimal re-renders
- Optimized image loading

### Loading States
- Form submission loading
- Payment processing loading
- API call handling
- Smooth user experience

## Accessibility

### ARIA Compliance
- Proper form labeling
- Screen reader support
- Keyboard navigation
- Focus management

### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop enhancement
- Cross-browser compatibility

## Security

### Data Protection
- Secure payment processing
- Personal information handling
- GDPR compliance considerations
- Input sanitization

### Payment Security
- PCI compliance considerations
- Secure payment forms
- Token-based processing
- Fraud prevention

## Future Enhancements

### Planned Features
- Social login integration
- Advanced payment options
- Group registration discounts
- Calendar integration
- Email notifications
- SMS reminders
- QR code check-in
- Mobile app integration

### Customization Options
- Custom branding
- Themed styling
- Multi-language support
- Custom form fields
- Workflow customization

## Support & Documentation

### Developer Resources
- Comprehensive prop documentation
- TypeScript interfaces
- Example implementations
- Troubleshooting guide

### User Documentation
- Registration guide
- Payment instructions
- Cancellation policy
- Contact information

---

The EventRegistration component provides a complete, production-ready solution for event registration that handles all aspects of the user journey from initial interest to confirmed registration, with robust error handling and a polished user experience that follows the Skool design system.