'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function AdminNotificationTester() {
  const [notificationType, setNotificationType] = useState('POST_LIKED');
  const { addToast } = useToast();

  const handleSendTest = async () => {
    try {
      await api.post('/api/notifications/test', { type: notificationType });
      addToast({ type: 'success', title: 'Test notification sent!' });
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to send notification' });
    }
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader><CardTitle>Notification Tester</CardTitle></CardHeader>
        <CardContent>
          <select 
            className="mb-4 p-2 border rounded"
            onChange={(e) => setNotificationType(e.target.value)}
            value={notificationType}
          >
            {/* Populate with NotificationType enum values */}
            <option value="POST_LIKED">Post Liked</option>
            <option value="NEW_MESSAGE">New Message</option>
            <option value="ACHIEVEMENT_UNLOCKED">Achievement Unlocked</option>
          </select>
          <Button onClick={handleSendTest}>Send Test</Button>
        </CardContent>
      </Card>
    </div>
  );
}