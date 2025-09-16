'use client';

import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Users, DollarSign, Image, Eye, Settings, Tag, Link, Upload } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { useCreateEvent } from '../../hooks/useEvents';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../../lib/toast';

// Form validation schema
const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  isOnline: z.boolean(),
  location: z.string().optional(),
  meetingUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional(),
  registrationDeadline: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative').optional(),
  currency: z.string().default('USD'),
  category: z.string().optional(),
  tags: z.string().optional(),
  thumbnail: z.string().optional(),
  waitlistEnabled: z.boolean().default(false),
  communityId: z.string().min(1, 'Community ID is required'),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventCreationFormProps {
  communityId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EventCreationForm({ communityId, onSuccess, onCancel }: EventCreationFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const { mutate: createEvent, isPending } = useCreateEvent();
  const { uploadFile, isUploading } = useUpload();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      communityId,
      isOnline: false,
      currency: 'USD',
      waitlistEnabled: false,
      price: 0,
    },
  });

  const watchedValues = watch();

  // Rich text editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Describe your event in detail...',
      }),
      ImageExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: watchedValues.description,
    onUpdate: ({ editor }) => {
      setValue('description', editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const uploadedUrl = await uploadFile(file);
      setUploadedImage(uploadedUrl);
      setValue('thumbnail', uploadedUrl);
    } catch (error) {
      console.error('Image upload failed:', error);
    }
  }, [uploadFile, setValue]);

  // Handle form submission
  const onSubmit = async (data: EventFormData) => {
    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);

      const eventData = {
        ...data,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : undefined,
        price: data.price || 0,
        capacity: data.capacity || undefined,
      };

      await createEvent(eventData);
      onSuccess?.();
    } catch (error) {
      console.error('Event creation failed:', error);
    }
  };

  // Rich text editor toolbar
  const EditorToolbar = () => (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBold().run()}
        className={editor?.isActive('bold') ? 'bg-gray-100' : ''}
      >
        Bold
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        className={editor?.isActive('italic') ? 'bg-gray-100' : ''}
      >
        Italic
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        className={editor?.isActive('bulletList') ? 'bg-gray-100' : ''}
      >
        List
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = prompt('Enter URL:');
          if (url) {
            editor?.chain().focus().setLink({ href: url }).run();
          }
        }}
      >
        Link
      </Button>
    </div>
  );

  // Event preview component
  const EventPreview = () => (
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle>Event Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {uploadedImage && (
          <img
            src={uploadedImage}
            alt="Event cover"
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <h3 className="text-xl font-bold mb-2">{watchedValues.title || 'Event Title'}</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {watchedValues.startDate && watchedValues.startTime
                ? format(new Date(`${watchedValues.startDate}T${watchedValues.startTime}`), 'PPP p')
                : 'Date and time'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {watchedValues.startDate && watchedValues.endDate && watchedValues.startTime && watchedValues.endTime
                ? `${format(new Date(`${watchedValues.startDate}T${watchedValues.startTime}`), 'p')} - ${format(new Date(`${watchedValues.endDate}T${watchedValues.endTime}`), 'p')}`
                : 'Duration'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>
              {watchedValues.isOnline
                ? watchedValues.meetingUrl || 'Online Event'
                : watchedValues.location || 'Location TBD'}
            </span>
          </div>
          {watchedValues.capacity && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{watchedValues.capacity} attendees max</span>
            </div>
          )}
          {watchedValues.price && watchedValues.price > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>${watchedValues.price} {watchedValues.currency}</span>
            </div>
          )}
        </div>
        {watchedValues.description && (
          <div className="mt-4 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: watchedValues.description }} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Event Title"
                  {...register('title')}
                  error={errors.title?.message}
                  placeholder="Enter event title"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Description
                  </label>
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <EditorToolbar />
                    <EditorContent
                      editor={editor}
                      className="prose prose-sm max-w-none p-3 min-h-[200px] focus:outline-none"
                    />
                  </div>
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      {...register('startDate')}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      {...register('startTime')}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.startTime && (
                      <p className="mt-1 text-xs text-red-600">{errors.startTime.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      {...register('endDate')}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      {...register('endTime')}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.endTime && (
                      <p className="mt-1 text-xs text-red-600">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Location & Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Online Event
                  </label>
                  <Controller
                    name="isOnline"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {watchedValues.isOnline ? (
                  <Input
                    label="Meeting URL"
                    {...register('meetingUrl')}
                    error={errors.meetingUrl?.message}
                    placeholder="https://zoom.us/j/123456789"
                  />
                ) : (
                  <Input
                    label="Location"
                    {...register('location')}
                    error={errors.location?.message}
                    placeholder="123 Main St, City, State"
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Capacity (optional)"
                    type="number"
                    {...register('capacity', { valueAsNumber: true })}
                    error={errors.capacity?.message}
                    placeholder="Leave empty for unlimited"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Deadline
                    </label>
                    <input
                      type="datetime-local"
                      {...register('registrationDeadline')}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Enable Waitlist
                  </label>
                  <Controller
                    name="waitlistEnabled"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Price"
                    type="number"
                    step="0.01"
                    {...register('price', { valueAsNumber: true })}
                    error={errors.price?.message}
                    placeholder="0 for free events"
                  />
                  <Input
                    label="Currency"
                    {...register('currency')}
                    error={errors.currency?.message}
                    placeholder="USD"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cover Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadedImage && (
                    <div className="relative">
                      <img
                        src={uploadedImage}
                        alt="Event cover preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setUploadedImage(null);
                          setValue('thumbnail', undefined);
                        }}
                        className="absolute top-2 right-2"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload an event cover image
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                      className="hidden"
                      id="cover-image-upload"
                    />
                    <label
                      htmlFor="cover-image-upload"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 cursor-pointer"
                    >
                      Choose Image
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Categories & Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Category"
                  {...register('category')}
                  error={errors.category?.message}
                  placeholder="e.g., Workshop, Seminar, Social"
                />
                <Input
                  label="Tags"
                  {...register('tags')}
                  error={errors.tags?.message}
                  placeholder="Comma-separated tags"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <EventPreview />
          </TabsContent>
        </form>
      </Tabs>

      <div className="flex justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            isLoading={isPending}
          >
            Create Event
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="mt-6">
          <EventPreview />
        </div>
      )}
    </div>
  );
}