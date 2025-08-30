'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '../ui/Card';
import { Clock, Users, BarChart, Play, Lock } from 'lucide-react';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    instructor: {
      name: string;
      avatar?: string;
    };
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    duration: number;
    enrollmentCount: number;
    price: number;
    currency: string;
    progress?: number;
    isEnrolled?: boolean;
  };
  communitySlug: string;
}

export function CourseCard({ course, communitySlug }: CourseCardProps) {
  const difficultyColors = {
    BEGINNER: 'bg-green-100 text-green-800',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
    ADVANCED: 'bg-red-100 text-red-800',
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Link href={`/communities/${communitySlug}/courses/${course.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative aspect-video bg-gray-200">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover rounded-t-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Play className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {course.isEnrolled && course.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
              <div className="flex items-center justify-between text-white text-sm mb-1">
                <span>Progress</span>
                <span>{course.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          )}

          {course.price > 0 && !course.isEnrolled && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded">
              ${course.price}
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${difficultyColors[course.difficulty]}`}>
              {course.difficulty}
            </span>
            {course.price === 0 ? (
              <span className="text-xs font-medium text-green-600">FREE</span>
            ) : course.isEnrolled ? (
              <span className="text-xs font-medium text-primary-600">ENROLLED</span>
            ) : (
              <Lock className="h-4 w-4 text-gray-400" />
            )}
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {course.title}
          </h3>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {course.description}
          </p>

          <div className="flex items-center space-x-3 text-sm text-gray-500 mb-3">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {formatDuration(course.duration)}
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {course.enrollmentCount}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
            {course.instructor.avatar ? (
              <Image
                src={course.instructor.avatar}
                alt={course.instructor.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
            )}
            <span className="text-sm text-gray-600">
              {course.instructor.name}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}