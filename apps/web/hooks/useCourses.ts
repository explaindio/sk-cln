import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

export interface Course {
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

export interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
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

export interface CourseFilters {
  search?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  minDuration?: number;
  maxDuration?: number;
  tags?: string[];
  page?: number;
  limit?: number;
}

export function useCourses(communityId?: string, filters: CourseFilters = {}) {
  const {
    search,
    difficulty,
    minDuration,
    maxDuration,
    tags,
    page = 1,
    limit = 20
  } = filters;

  return useQuery({
    queryKey: ['courses', communityId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (communityId) params.append('communityId', communityId);
      if (search) params.append('search', search);
      if (difficulty) params.append('difficulty', difficulty);
      if (minDuration !== undefined) params.append('minDuration', minDuration.toString());
      if (maxDuration !== undefined) params.append('maxDuration', maxDuration.toString());
      if (tags && tags.length > 0) params.append('tags', tags.join(','));
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const { data } = await api.get(`/api/courses?${params.toString()}`);
      return data.courses || data;
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

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ['courseProgress', courseId],
    queryFn: async () => {
      const { data } = await api.get(`/api/courses/${courseId}/progress`);
      return data;
    },
    enabled: !!courseId,
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await api.post(`/api/courses/lessons/${lessonId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseProgress'] });
      addToast({
        type: 'success',
        title: 'Lesson completed',
      });
    },
  });
}

export function useUpdateVideoProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      progress,
    }: {
      lessonId: string;
      progress: number;
    }) => {
      const response = await api.post(`/api/courses/lessons/${lessonId}/progress`, {
        progress,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseProgress'] });
    },
  });
}