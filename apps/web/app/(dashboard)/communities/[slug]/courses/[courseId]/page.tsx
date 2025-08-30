'use client';

import { useState } from 'react';
import { useCourse, useEnrollCourse } from 'hooks/useCourses' (see below for file content);
import { useCourseProgress } from 'hooks/useCourseProgress' (see below for file content);
import { Button } from 'components/ui/Button' (see below for file content);
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card' (see below for file content);
import { Loading } from 'components/ui/Loading' (see below for file content);
import {
  Clock,
  Users,
  BarChart,
  Award,
  Lock,
  Play,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface CourseDetailPageProps {
  params: {
    slug: string;
    courseId: string;
  };
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { data: course, isLoading } = useCourse(params.courseId);
  const { data: progress } = useCourseProgress(params.courseId);
  const enrollCourse = useEnrollCourse();
  const [showFullDescription, setShowFullDescription] = useState(false);

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  const isEnrolled = !!progress;
  const totalLessons = course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0
  );

  const handleEnroll = async () => {
    await enrollCourse.mutateAsync(params.courseId);
  };

  const difficultyColors = {
    BEGINNER: 'bg-green-100 text-green-800',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
    ADVANCED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Course Header */}
          <div>
            <div className="aspect-video relative bg-gray-200 rounded-lg overflow-hidden mb-4">
              {course.thumbnail ? (
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Play className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className={`px-2 py-1 rounded ${difficultyColors[course.difficulty]}`}>
                {course.difficulty}
              </span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {Math.floor(course.duration / 60)}h {course.duration % 60}m
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {course.enrollmentCount} students
              </div>
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this course</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-gray-600 ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                {course.description}
              </p>
              {course.description.length > 200 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-primary-600 text-sm mt-2"
                >
                  {showFullDescription ? 'Show less' : 'Read more'}
                </button>
              )}
            </CardContent>
          </Card>

          {/* Course Content */}
          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.modules.map((module, index) => (
                  <div key={module.id}>
                    <h3 className="font-medium mb-2">
                      Module {index + 1}: {module.title}
                    </h3>
                    <div className="space-y-1 ml-4">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            {lesson.type === 'VIDEO' && <Play className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm">{lesson.title}</span>
                            {lesson.isPreview && (
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                Preview
                              </span>
                            )}
                          </div>
                          {lesson.duration && (
                            <span className="text-xs text-gray-500">
                              {lesson.duration} min
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              {course.price > 0 ? (
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold">${course.price}</p>
                  <p className="text-sm text-gray-600">{course.currency}</p>
                </div>
              ) : (
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold text-green-600">FREE</p>
                </div>
              )}

              {isEnrolled ? (
                <>
                  <Link href={`/communities/${params.slug}/courses/${params.courseId}/learn`}>
                    <Button className="w-full mb-3">
                      Continue Learning
                    </Button>
                  </Link>

                  {progress && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
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
                </>
              ) : (
                <Button
                  onClick={handleEnroll}
                  isLoading={enrollCourse.isPending}
                  className="w-full"
                >
                  {course.price > 0 ? 'Enroll Now' : 'Enroll for Free'}
                </Button>
              )}

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  {totalLessons} lessons
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Certificate of completion
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Lifetime access
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructor */}
          <Card>
            <CardHeader>
              <CardTitle>Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full" />
                <div>
                  <p className="font-medium">Instructor Name</p>
                  <p className="text-sm text-gray-600">Expert Developer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}