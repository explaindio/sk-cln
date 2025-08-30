'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/lib/toast';

function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const response = await api.get('/api/users/me/preferences');
      return response.data;
    },
  });
}

function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (prefs: any) => api.patch('/api/users/me/preferences', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      addToast({ type: 'success', title: 'Preferences saved' });
    },
  });
}

export function GamificationSettings() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const [settings, setSettings] = useState({
    showLeaderboard: true,
    emailNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    if (preferences) {
      setSettings({
        showLeaderboard: preferences.showLeaderboard ?? true,
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
      });
    }
  }, [preferences]);

  const handleToggle = (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    updatePreferences.mutate(newSettings);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gamification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gamification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="showLeaderboard" className="text-sm font-medium">
              Show me on leaderboards
            </label>
            <p className="text-sm text-gray-600">
              Allow other users to see your ranking and achievements
            </p>
          </div>
          <Switch
            id="showLeaderboard"
            checked={settings.showLeaderboard}
            onCheckedChange={() => handleToggle('showLeaderboard')}
            disabled={updatePreferences.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="emailNotifications" className="text-sm font-medium">
              Email me about new achievements
            </label>
            <p className="text-sm text-gray-600">
              Receive email notifications when you unlock new achievements
            </p>
          </div>
          <Switch
            id="emailNotifications"
            checked={settings.emailNotifications}
            onCheckedChange={() => handleToggle('emailNotifications')}
            disabled={updatePreferences.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="pushNotifications" className="text-sm font-medium">
              Push notifications for gamification
            </label>
            <p className="text-sm text-gray-600">
              Receive push notifications for achievements and milestones
            </p>
          </div>
          <Switch
            id="pushNotifications"
            checked={settings.pushNotifications}
            onCheckedChange={() => handleToggle('pushNotifications')}
            disabled={updatePreferences.isPending}
          />
        </div>

        {updatePreferences.isPending && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">Saving preferences...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}