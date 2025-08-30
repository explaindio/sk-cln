'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCommunity } from '../../../../hooks/useCommunity';
import { useAuthStore } from '../../../../store/authStore';
import { CommunityForm, CommunityFormData } from '../../../../components/forms/CommunityForm';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Loading } from '../../../../components/ui/Loading';

interface SettingsPageProps {
  params: { slug: string };
}

export default function CommunitySettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: community, isLoading } = useCommunity(params.slug);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) return <Loading size="lg" className="mt-8" />;

  if (!community) {
    return <div>Community not found</div>;
  }

  // Check if user is owner
  const isOwner = community.owner.id === user?.id;

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-600">
            Only community owners can access settings
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = async (data: CommunityFormData) => {
    // TODO: Implement update
    console.log('Updating community:', data);
  };

  const handleDelete = async () => {
    // TODO: Implement delete
    console.log('Deleting community');
    router.push('/communities');
  };

  return (
    <div className="max-w-2xl">
      <CommunityForm
        initialData={{
          name: community.name,
          slug: community.slug,
          description: community.description,
          type: community.type,
        }}
        onSubmit={handleUpdate}
      />

      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Once you delete a community, there is no going back. Please be certain.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Community
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-600">
                Are you sure you want to delete this community?
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="danger"
                  onClick={handleDelete}
                >
                  Yes, Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}