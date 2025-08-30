'use client';

import { useRouter } from 'next/navigation';
import { CourseBuilder } from '@/components/courses/CourseBuilder';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface NewCoursePageProps {
  params: { slug: string };
}

export default function NewCoursePage({ params }: NewCoursePageProps) {
  const router = useRouter();

  const handleSuccess = (course: any) => {
    // Navigate to the course detail page or course list
    router.push(`/communities/${params.slug}/courses`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href={`/communities/${params.slug}/courses`}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Courses
              </Link>
              <div className="border-l border-gray-300 h-6" />
              <h1 className="text-xl font-semibold text-gray-900">Create New Course</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CourseBuilder
          communityId={params.slug}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}