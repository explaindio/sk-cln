import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  communityId: string;
  instructorId: string;
  price: number;
  currency: string;
  published: boolean;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number; // in minutes
  enrollmentCount: number;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  content?: string;
  videoUrl?: string;
  duration?: number;
  order: number;
  isPreview: boolean;
}

export function useCourses(communityId?: string) {
  return useQuery<Course[]>({
    queryKey: ['courses', communityId],
    queryFn: async () => {
      const params = communityId ? `?communityId=${communityId}` : '';
      const { data } = await api.get(`/api/courses${params}`);
      return data;
    },
  });
}

export function useCourse(courseId: string) {
  return useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await api.get(`/api/courses/${courseId}`);
      return data;
    },
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (courseData: Partial<Course>) => {
      const response = await api.post('/api/courses', courseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      addToast({
        type: 'success',
        title: 'Course created successfully',
      });
    },
    onError: (error: any) => {
      addToast({
        type: 'error',
        title: 'Failed to create course',
        message: error.response?.data?.error,
      });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({
      courseId,
      data,
    }: {
      courseId: string;
      data: Partial<Course>;
    }) => {
      const response = await api.patch(`/api/courses/${courseId}`, data);
      return response.data;
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      addToast({
        type: 'success',
        title: 'Course updated',
      });
    },
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.post(`/api/courses/${courseId}/enroll`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      addToast({
        type: 'success',
        title: 'Successfully enrolled in course',
      });
    },
  });
}