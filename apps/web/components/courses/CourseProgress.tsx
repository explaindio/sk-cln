'use client';

import { useCourseProgress } from '@/hooks/useCourseProgress';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { CheckCircle, Circle, Lock } from 'lucide-react';

interface CourseProgressProps {
  courseId: string;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      type: string;
      duration?: number;
    }>;
  }>;
  currentLessonId?: string;
  onLessonClick: (lessonId: string) => void;
}

export function CourseProgress({
  courseId,
  modules,
  currentLessonId,
  onLessonClick,
}: CourseProgressProps) {
  const { data: progress } = useCourseProgress(courseId);

  const isLessonCompleted = (lessonId: string) => {
    return progress?.completedLessons.includes(lessonId) || false;
  };

  const isLessonAccessible = (lessonId: string, moduleIndex: number, lessonIndex: number) => {
    // First lesson is always accessible
    if (moduleIndex === 0 && lessonIndex === 0) return true;

    // Check if previous lesson is completed
    if (lessonIndex > 0) {
      const prevLesson = modules[moduleIndex].lessons[lessonIndex - 1];
      return isLessonCompleted(prevLesson.id);
    }

    // Check if last lesson of previous module is completed
    if (moduleIndex > 0) {
      const prevModule = modules[moduleIndex - 1];
      const lastLesson = prevModule.lessons[prevModule.lessons.length - 1];
      return isLessonCompleted(lastLesson.id);
    }

    return false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Content</CardTitle>
        {progress && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span>{progress.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <div key={module.id}>
              <h3 className="font-medium mb-2">{module.title}</h3>
              <div className="space-y-1 ml-4">
                {module.lessons.map((lesson, lessonIndex) => {
                  const isCompleted = isLessonCompleted(lesson.id);
                  const isAccessible = isLessonAccessible(lesson.id, moduleIndex, lessonIndex);
                  const isCurrent = lesson.id === currentLessonId;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => isAccessible && onLessonClick(lesson.id)}
                      disabled={!isAccessible}
                      className={`w-full text-left flex items-center space-x-3 p-2 rounded transition-colors ${
                        isCurrent
                          ? 'bg-primary-50 border border-primary-200'
                          : isAccessible
                          ? 'hover:bg-gray-50'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : isAccessible ? (
                        <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${isCompleted ? 'text-gray-600' : ''}`}>
                          {lesson.title}
                        </p>
                        {lesson.duration && (
                          <p className="text-xs text-gray-500">
                            {lesson.duration} min
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}