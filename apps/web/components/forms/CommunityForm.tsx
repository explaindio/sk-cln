'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import React from 'react';

const communitySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['PUBLIC', 'PRIVATE', 'PAID']),
  price: z.number().optional(),
});

export type CommunityFormData = z.infer<typeof communitySchema>;

interface CommunityFormProps {
  initialData?: Partial<CommunityFormData>;
  onSubmit: (data: CommunityFormData) => void;
  isLoading?: boolean;
}

export function CommunityForm({
  initialData,
  onSubmit,
  isLoading,
}: CommunityFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      type: 'PUBLIC',
      ...initialData,
    },
  });

  const communityType = watch('type');
  const nameValue = watch('name');

  // Auto-generate slug from name
  React.useEffect(() => {
    if (nameValue && !initialData?.slug) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setValue('slug', slug);
    }
  }, [nameValue, setValue, initialData]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Community Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Enter community name"
          />

          <Input
            label="URL Slug"
            {...register('slug')}
            error={errors.slug?.message}
            placeholder="community-url-slug"
            className="lowercase"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe your community..."
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Community Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                value="PUBLIC"
                {...register('type')}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Public</span>
                <p className="text-sm text-gray-500">
                  Anyone can view and join
                </p>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                value="PRIVATE"
                {...register('type')}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Private</span>
                <p className="text-sm text-gray-500">
                  Requires approval to join
                </p>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                value="PAID"
                {...register('type')}
                className="mr-3"
              />
              <div>
                <span className="font-medium">Paid</span>
                <p className="text-sm text-gray-500">
                  Requires payment to join
                </p>
              </div>
            </label>
          </div>

          {communityType === 'PAID' && (
            <div className="mt-4">
              <Input
                label="Monthly Price ($)"
                type="number"
                {...register('price', { valueAsNumber: true })}
                error={errors.price?.message}
                placeholder="29.99"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" isLoading={isLoading} className="w-full">
        {initialData ? 'Update Community' : 'Create Community'}
      </Button>
    </form>
  );
}