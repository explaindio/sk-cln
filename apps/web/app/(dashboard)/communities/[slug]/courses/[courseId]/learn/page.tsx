'use client';

import { useState } from 'react';
import { useCourse } from '@/hooks/useCourses';
import { useMarkLessonComplete } from '@/hooks/useCourseProgress';
import { LessonContent } from '@/components/courses/LessonContent';
import { CourseProgress } from '@/components/courses/CourseProgress';
import { Loading } from '@/components/ui/Loading';

interface LearningPageProps {
  params: {
    slug: string;
    courseId: string;
  };
}

export default function CourseLearningPage({ params }: LearningPageProps) {
  const { data: course, isLoading } = useCourse(params.courseId);
  const markComplete = useMarkLessonComplete();
  const [currentLessonId, setCurrentLessonId] = useState<string>('');

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  // Get all lessons flat array
  const allLessons = course.modules.flatMap(module =>
    module.lessons.map(lesson => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title,
    }))
  );

  // Set initial lesson if not set
  if (!currentLessonId && allLessons.length > 0) {
    setCurrentLessonId(allLessons[0].id);
  }

  const currentLessonIndex = allLessons.findIndex(l => l.id === currentLessonId);
  const currentLesson = allLessons[currentLessonIndex];

  const handleLessonComplete = async () => {
    await markComplete.mutateAsync({
      courseId: params.courseId,
      lessonId: currentLessonId,
    });

    // Auto-advance to next lesson
    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentLessonIndex + 1].id);
    }
  };

  const handleNext = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonId(allLessons[currentLessonIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonId(allLessons[currentLessonIndex - 1].id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {currentLesson && (
            <LessonContent
              lesson={currentLesson}
              onComplete={handleLessonComplete}
              onNext={handleNext}
              onPrevious={handlePrevious}
              hasNext={currentLessonIndex < allLessons.length - 1}
              hasPrevious={currentLessonIndex > 0}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <CourseProgress
            courseId={params.courseId}
            modules={course.modules}
            currentLessonId={currentLessonId}
            onLessonClick={setCurrentLessonId}
          />
        </div>
      </div>
    </div>
  );
}