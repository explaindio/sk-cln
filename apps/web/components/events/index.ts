// Event Components
export { EventReminderManager } from './EventReminderManager';
export { AttendeeManagement } from './AttendeeManagement';

// Loading States and Error Handling
export {
  EventListSkeleton,
  EventCardSkeleton,
  EventDetailSkeleton,
  RegistrationFormSkeleton,
  CalendarLoadingSkeleton,
  ErrorMessage,
  OfflineIndicator,
  EventErrorBoundary,
  useLoadingState,
  LoadingWrapper,
} from './EventLoadingStates';

// Integration Components
export {
  EventRegistrationWithLoading,
  CalendarViewWithLoading,
  EventIntegrationExample,
} from './EventRegistrationWithLoading';

// Demo Components
export {
  EventLoadingStatesDemo,
  EventLoadingStatesDemoPage,
} from './EventLoadingStates.test';

// Example Components
export { AttendeeManagementExample } from './AttendeeManagementExample';

// Re-export types for convenience
export type { 
  EventAttendee, 
  AttendeeStatus, 
  CreateAttendeeData, 
  UpdateAttendeeData 
} from '../../hooks/useEventAttendees';

export type { 
  EventReminder, 
  CreateReminderData 
} from '../../hooks/useEventReminders';