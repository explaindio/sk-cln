'use client';

import { useCourses } from '../../../../../hooks/useCourses';
import { useEnrollCourse } from '../../../../../hooks/useCourses';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorBoundary, CourseListSkeleton, ErrorMessage, OfflineIndicator } from '../../../../../components/courses/CourseLoadingStates';

export default function CoursesPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const { data: courses, isLoading, error, refetch } = useCourses(slug);
  const enrollMutation = useEnrollCourse();
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const isOffline = typeof window !== 'undefined' ? !navigator.onLine : false;

  if (isLoading) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <CourseListSkeleton />
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <ErrorMessage title="Failed to load courses" message={error.message} onRetry={refetch} />
      </ErrorBoundary>
    );
  }

  const handleEnroll = async (courseId: string) => {
    setEnrollingCourseId(courseId);
    try {
      await enrollMutation.mutateAsync(courseId);
    } catch (error) {
      console.error('Enrollment failed:', error);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Courses</h1>
        <p className="text-gray-600">Explore and enroll in courses to enhance your learning</p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
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
                      className="w-12 h-12 text-gray-400"
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
                {course.published && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Published
                  </div>
                )}
              </div>

              {/* Course Content */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* Course Meta */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{course.enrollmentCount} enrolled</span>
                  <span>{course.duration} min</span>
                </div>

                {/* Difficulty Badge */}
                <div className="mb-4">
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

                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    ${course.price}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    {course.currency}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Link
                    href={`/communities/${slug}/courses/${course.id}`}
                    className="flex-1 px-4 py-2 bg-white text-black font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-center text-sm"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrollingCourseId === course.id}
                    className="flex-1 px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                  >
                    {enrollingCourseId === course.id ? 'Enrolling...' : 'Enroll'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses available</h3>
          <p className="text-gray-500">
            There are no courses available in this community yet.
          </p>
        </div>
      )}
    </div>
  );
}