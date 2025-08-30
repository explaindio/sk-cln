'use client';

import { useRouter } from 'next/navigation';
import { useCreateCommunity } from '@/hooks/useCommunity';
import { CommunityForm, CommunityFormData } from '@/components/forms/CommunityForm';

export default function NewCommunityPage() {
  const router = useRouter();
  const createCommunity = useCreateCommunity();

  const handleSubmit = async (data: CommunityFormData) => {
    try {
      const community = await createCommunity.mutateAsync(data);
      router.push(`/communities/${community.slug}`);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create New Community
      </h1>

      <CommunityForm
        onSubmit={handleSubmit}
        isLoading={createCommunity.isPending}
      />
    </div>
  );
}