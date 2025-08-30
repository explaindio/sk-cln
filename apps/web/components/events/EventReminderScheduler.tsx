'use client';

import { useState } from 'react';
import { useScheduleReminder } from '../../hooks/useEventReminders';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface EventReminderSchedulerProps {
  eventId: string;
}

export function EventReminderScheduler({ eventId }: EventReminderSchedulerProps) {
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [message, setMessage] = useState('');
  const scheduleReminder = useScheduleReminder();

  const handleSchedule = () => {
    if (!reminderDate || !reminderTime) {
      alert('Please select a date and time for the reminder.');
      return;
    }
    const scheduledFor = new Date(`${reminderDate}T${reminderTime}`);
    scheduleReminder.mutate({
      eventId,
      type: 'EMAIL', // Defaulting to EMAIL for now
      scheduledFor,
      message,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule a Reminder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional: Custom message for the reminder"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <Button onClick={handleSchedule} isLoading={scheduleReminder.isPending}>
          Schedule Reminder
        </Button>
      </CardContent>
    </Card>
  );
}