'use client';

import { useState, useEffect } from 'react';
import { useNotificationPreferences, useUpdateNotificationPreferences, usePushNotifications } from '@/hooks/useNotifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/lib/toast';

export default function NotificationSettingsPage() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { permission, subscribeToPush, unsubscribeFromPush } = usePushNotifications();
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const { addToast } = useToast();

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  if (isLoading || !localPreferences) {
    return <Loading size="lg" />;
  }

  const handleToggle = (key: keyof typeof localPreferences) => {
    setLocalPreferences((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    await updatePreferences.mutateAsync(localPreferences);
    addToast({ type: 'success', title: 'Settings saved!' });
  };

  const handlePushToggle = async () => {
    if (permission === 'granted' && localPreferences.pushEnabled) {
      await unsubscribeFromPush();
      handleToggle('pushEnabled');
    } else {
      const success = await subscribeToPush();
      if (success) {
        handleToggle('pushEnabled');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Notification Settings</h1>
      
      <div className="space-y-6">
        {/* In-App Notifications */}
        <Card>
          <CardHeader><CardTitle>In-App Notifications</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="inAppSound">Enable Notification Sound</label>
              <Switch id="inAppSound" checked={localPreferences.inAppSound} onCheckedChange={() => handleToggle('inAppSound')} />
            </div>
            <div className="mb-4">
              <label htmlFor="soundSelect" className="block mb-2">Notification Sound</label>
              <select
                id="soundSelect"
                className="w-full p-2 border rounded"
                value={localPreferences.notificationSound || 'default.mp3'}
                onChange={(e) => setLocalPreferences({...localPreferences, notificationSound: e.target.value})}
                disabled={!localPreferences.inAppSound}
              >
                <option value="default.mp3">Default</option>
                <option value="chime.mp3">Chime</option>
                <option value="ding.mp3">Ding</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader><CardTitle>Email Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="emailEnabled">Enable All Email</label>
              <Switch id="emailEnabled" checked={localPreferences.emailEnabled} onCheckedChange={() => handleToggle('emailEnabled')} />
            </div>
            {/* Add more granular controls here */}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader><CardTitle>Push Notifications</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <label htmlFor="pushEnabled">Enable Push Notifications</label>
              <Button onClick={handlePushToggle} disabled={permission === 'denied'}>
                {localPreferences.pushEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Do Not Disturb */}
        <Card>
          <CardHeader><CardTitle>Do Not Disturb</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="dndEnabled">Enable Do Not Disturb</label>
              <Switch id="dndEnabled" checked={localPreferences.dndEnabled} onCheckedChange={() => handleToggle('dndEnabled')} />
            </div>
            {localPreferences.dndEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>From</label>
                  <Input type="time" value={localPreferences.dndStart || ''} onChange={(e) => setLocalPreferences({...localPreferences, dndStart: e.target.value})} />
                </div>
                <div>
                  <label>To</label>
                  <Input type="time" value={localPreferences.dndEnd || ''} onChange={(e) => setLocalPreferences({...localPreferences, dndEnd: e.target.value})} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
         
        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={updatePreferences.isPending}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}