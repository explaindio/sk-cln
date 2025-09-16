'use client';

import { useCourse, useCourseProgress, useEnrollCourse } from '../../../../../../hooks/useCourses';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ErrorBoundary, ErrorMessage, OfflineIndicator } from '../../../../../../../components/courses/CourseLoadingStates';

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const courseId = params.courseId as string;
  
  const { data: course, isLoading: courseLoading, error, refetch } = useCourse(courseId);
  const { data: progress } = useCourseProgress(courseId);
  const enrollMutation = useEnrollCourse();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const isOffline = typeof window !== 'undefined' ? !navigator.onLine : false;

  if (courseLoading) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-pulse bg-gray-200 rounded-xl p-8 max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-300 rounded mb-8" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-300 rounded w-3/4" />
              <div className="h-4 bg-gray-300 rounded w-1/2" />
              <div className="flex space-x-4">
                <div className="h-10 bg-gray-300 rounded-lg flex-1" />
                <div className="h-10 bg-gray-300 rounded-lg w-32" />
              </div>
            </div>
          </div>
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

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      await enrollMutation.mutateAsync(courseId);
    } catch (error) {
      console.error('Enrollment failed:', error);
    } finally {
      setIsEnrolling(false);
    }
  };

  const isEnrolled = progress?.enrolled || false;
  const completionPercentage = progress?.completionPercentage || 0;

  return (
    <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
      <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
      <div className="max-w-4xl mx-auto">
        {/* Course Header */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        {/* Course Thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {course.title}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {course.description}
              </p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>{course.enrollmentCount} enrolled</span>
                <span>{course.duration} minutes</span>
                <span
                  className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${
                      course.difficulty === 'BEGINNER'
                        ? 'bg-green-100 text-green-800'
                        : course.difficulty === 'INTERMEDIATE'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }
                  `}
                >
                  {course.difficulty}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                ${course.price}
              </div>
              <div className="text-sm text-gray-500">
                {course.currency}
              </div>
            </div>
          </div>

          {/* Progress Bar (if enrolled) */}
          {isEnrolled && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Course Progress</span>
                <span className="text-sm text-gray-500">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Link
              href={`/communities/${slug}/courses`}
              className="px-6 py-2.5 bg-white text-black font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Back to Courses
            </Link>
            {isEnrolled ? (
              <Link
                href={`/communities/${slug}/courses/${courseId}/learn`}
                className="px-6 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Continue Learning
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="px-6 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course Modules */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Course Content</h2>
        </div>
        
        <div className="p-6">
          {course.modules && course.modules.length > 0 ? (
            <div className="space-y-6">
              {course.modules.map((module, moduleIndex) => (
                <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">
                      Module {moduleIndex + 1}: {module.title}
                    </h3>
                    {module.description && (
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    )}
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {lesson.type === 'VIDEO' && (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1" />
                                </svg>
                              )}
                              {lesson.type === 'TEXT' && (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              {lesson.type === 'QUIZ' && (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              )}
                              {lesson.type === 'ASSIGNMENT' && (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                {lessonIndex + 1}. {lesson.title}
                              </h4>
                              {lesson.duration && (
                                <p className="text-xs text-gray-500">
                                  {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {lesson.isPreview && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Preview
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No modules available for this course yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}