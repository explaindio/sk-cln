'use client';

import { useState } from 'react';
import { useCourses } from '@/hooks/useCourses';
import { useCommunity } from '@/hooks/useCommunity';
import { CourseCard } from '@/components/courses/CourseCard';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, BookOpen, Filter, Search } from 'lucide-react';
import Link from 'next/link';

interface CoursesPageProps {
  params: { slug: string };
}

export default function CoursesPage({ params }: CoursesPageProps) {
  const { data: community } = useCommunity(params.slug);
  const { data: courses, isLoading } = useCourses(community?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterPrice, setFilterPrice] = useState<string>('');

  const isInstructor = false; // TODO: Check if user is instructor

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = !filterDifficulty || course.difficulty === filterDifficulty;
    const matchesPrice = !filterPrice ||
                         (filterPrice === 'free' && course.price === 0) ||
                         (filterPrice === 'paid' && course.price > 0);

    return matchesSearch && matchesDifficulty && matchesPrice;
  });

  if (isLoading) {
    return <Loading size="lg" className="mt-8" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        {isInstructor && (
          <Link href={`/communities/${params.slug}/courses/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          <select
            value={filterPrice}
            onChange={(e) => setFilterPrice(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Prices</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {filteredCourses?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No courses found</p>
            {isInstructor && (
              <p className="text-sm text-gray-500 mt-2">
                Create your first course to get started!
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses?.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              communitySlug={params.slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}