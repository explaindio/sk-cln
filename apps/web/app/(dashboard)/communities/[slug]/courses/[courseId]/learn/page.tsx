'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VideoPlayer } from '../../../../../../../components/courses/VideoPlayer';
import { useCourse, useCourseProgress } from '../../../../../../../hooks/useCourses';
import { ChevronLeft, ChevronRight, CheckCircle, PlayCircle, FileText, HelpCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import { ErrorBoundary, VideoPlayerSkeleton, ProgressBarSkeleton, ErrorMessage, OfflineIndicator, CourseListSkeleton } from '../../../../../../../components/courses/CourseLoadingStates';

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
  moduleId?: string;
  moduleTitle?: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export default function CourseLearningPage() {
  const params = useParams();
  const slug = params.slug as string;
  const courseId = params.courseId as string;
  
  const { data: course, isLoading: courseLoading, error, refetch } = useCourse(courseId);
  const { data: progress } = useCourseProgress(courseId);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [lessonProgress, setLessonProgress] = useState(0);
  const isOffline = typeof window !== 'undefined' ? !navigator.onLine : false;

  // Get all lessons from all modules
  const allLessons = course?.modules?.flatMap((module: Module) =>
    module.lessons?.map((lesson: Lesson) => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title
    })) || []
  ) || [];

  useEffect(() => {
    if (course && allLessons.length > 0) {
      // Find the first incomplete lesson or start from the beginning
      const firstIncompleteIndex = allLessons.findIndex((lesson: Lesson) =>
        !progress?.completedLessons?.includes(lesson.id)
      );
      setCurrentLessonIndex(firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex);
    }
  }, [course, progress, allLessons]);

  if (courseLoading) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <div className="flex justify-center items-center min-h-screen">
          <VideoPlayerSkeleton />
        </div>
      </ErrorBoundary>
    );
  }

  if (error || !course) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <ErrorMessage title="Course not found or failed to load" message="Please check your connection and try again." onRetry={refetch} />
      </ErrorBoundary>
    );
  }

  if (allLessons.length === 0) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons available</h3>
            <p className="text-gray-500">This course doesn't have any lessons yet.</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const currentLesson = allLessons[currentLessonIndex];
  const isCompleted = progress?.completedLessons?.includes(currentLesson.id);
  const completedLessonsCount = progress?.completedLessons?.length || 0;
  const overallProgress = (completedLessonsCount / allLessons.length) * 100;

  const handleLessonComplete = () => {
    console.log(`Lesson ${currentLesson.id} completed!`);
  };

  const handleProgressUpdate = (progressPercent: number) => {
    setLessonProgress(progressPercent);
    console.log(`Lesson progress: ${progressPercent}%`);
  };

  const navigateLesson = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      setLessonProgress(0);
    } else if (direction === 'next' && currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setLessonProgress(0);
    }
  };

  const goToLesson = (lessonIndex: number) => {
    setCurrentLessonIndex(lessonIndex);
    setLessonProgress(0);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <PlayCircle className="w-4 h-4" />;
      case 'TEXT':
        return <FileText className="w-4 h-4" />;
      case 'QUIZ':
        return <HelpCircle className="w-4 h-4" />;
      case 'ASSIGNMENT':
        return <Edit className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
      <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/communities/${slug}/courses/${courseId}`}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Course
                  </Link>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
                    <p className="text-sm text-gray-600">
                      Lesson {currentLessonIndex + 1} of {allLessons.length} • {currentLesson.moduleTitle}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Overall Progress</p>
                    <p className="text-lg font-semibold text-gray-900">{Math.round(overallProgress)}%</p>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <ProgressBarSkeleton className="w-full" />
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Course Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 sticky top-24">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Course Content</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {course.modules?.length || 0} modules • {allLessons.length} lessons
                </p>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                {course.modules && course.modules.map((module: Module, moduleIndex: number) => (
                  <div key={module.id} className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                      Module {moduleIndex + 1}: {module.title}
                    </h4>
                    
                    <div className="space-y-1">
                      {module.lessons && module.lessons.map((lesson: Lesson, lessonIndex: number) => {
                        const lessonIndexInCourse = allLessons.findIndex((l: Lesson) => l.id === lesson.id);
                        const isCurrent = lessonIndexInCourse === currentLessonIndex;
                        const isCompleted = progress?.completedLessons?.includes(lesson.id);
                        
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => goToLesson(lessonIndexInCourse)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              isCurrent
                                ? 'bg-black text-white'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <div className={`w-4 h-4 rounded-full border-2 ${
                                    isCurrent ? 'border-white' : 'border-gray-300'
                                  }`}></div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isCurrent ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {lesson.title}
                                </p>
                                {lesson.duration && (
                                  <p className={`text-xs ${
                                    isCurrent ? 'text-gray-200' : 'text-gray-500'
                                  }`}>
                                    {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex-shrink-0">
                                {getLessonIcon(lesson.type)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Lesson Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h2>
                    {currentLesson.description && (
                      <p className="text-gray-600 mt-2">{currentLesson.description}</p>
                    )}
                  </div>
                  {isCompleted && (
                    <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Completed
                    </span>
                  )}
                </div>
                
                {/* Lesson Progress */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Lesson Progress:</span>
                  <ProgressBarSkeleton />
                  <span className="text-sm font-semibold text-gray-900">{Math.round(lessonProgress)}%</span>
                </div>
              </div>

              {/* Lesson Content */}
              {currentLesson.type === 'VIDEO' && currentLesson.videoUrl && (
                <div className="aspect-video bg-black">
                  <VideoPlayer
                    src={currentLesson.videoUrl}
                    lessonId={currentLesson.id}
                    courseId={courseId}
                    onProgress={handleProgressUpdate}
                    onComplete={handleLessonComplete}
                    className="h-full"
                  />
                </div>
              )}

              {currentLesson.type === 'TEXT' && currentLesson.content && (
                <div className="p-8">
                  <div className="prose prose-gray max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                  </div>
                </div>
              )}

              {currentLesson.type === 'QUIZ' && (
                <div className="p-8">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Lesson</h3>
                    <p className="text-gray-600">Interactive quiz content would be displayed here.</p>
                  </div>
                </div>
              )}

              {currentLesson.type === 'ASSIGNMENT' && (
                <div className="p-8">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Edit className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Assignment Lesson</h3>
                    <p className="text-gray-600">Assignment submission interface would be displayed here.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => navigateLesson('prev')}
                disabled={currentLessonIndex === 0}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Previous Lesson</span>
              </button>

              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {currentLessonIndex + 1} of {allLessons.length}
                </span>
              </div>

              <button
                onClick={() => navigateLesson('next')}
                disabled={currentLessonIndex === allLessons.length - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next Lesson</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ErrorBoundary>
  );
}