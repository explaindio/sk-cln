'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function AvatarSettingsPage() {
  const { user, setAuth } = useAuthStore();
  const [updating, setUpdating] = useState(false);
  const { addToast } = useToast();

  const handleAvatarUpload = async (imageUrl: string) => {
    setUpdating(true);

    try {
      const { data } = await api.put('/api/users/me', {
        avatarUrl: imageUrl,
      });

      // Update local state
      setAuth(data.user, user?.accessToken!, user?.refreshToken!);

      addToast({
        type: 'success',
        title: 'Avatar updated successfully',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to update avatar',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            currentImage={user?.avatarUrl}
            onUpload={handleAvatarUpload}
            aspectRatio="square"
            maxSize={5}
          />

          <p className="text-sm text-gray-600 mt-4">
            Recommended: Square image, at least 400x400 pixels
          </p>
        </CardContent>
      </Card>
    </div>
  );
}