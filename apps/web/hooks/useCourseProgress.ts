import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CourseProgress {
  courseId: string;
  userId: string;
  completedLessons: string[];
  currentLessonId?: string;
  progressPercentage: number;
  lastAccessedAt: string;
  completedAt?: string;
}

export function useCourseProgress(courseId: string) {
  return useQuery<CourseProgress>({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      const { data } = await api.get(`/api/courses/${courseId}/progress`);
      return data;
    },
    enabled: !!courseId,
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      lessonId,
    }: {
      courseId: string;
      lessonId: string;
    }) => {
      const response = await api.post(
        `/api/courses/${courseId}/lessons/${lessonId}/complete`
      );
      return response.data;
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({
        queryKey: ['course-progress', courseId]
      });
    },
  });
}

export function useUpdateVideoProgress() {
  return useMutation({
    mutationFn: async ({
      courseId,
      lessonId,
      progress,
    }: {
      courseId: string;
      lessonId: string;
      progress: number;
    }) => {
      const response = await api.post(
        `/api/courses/${courseId}/lessons/${lessonId}/progress`,
        { progress }
      );
      return response.data;
    },
  });
}