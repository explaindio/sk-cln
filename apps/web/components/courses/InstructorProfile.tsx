import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, User, BookOpen } from 'lucide-react';
import { CourseCard } from './CourseCard';

interface Instructor {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  credentials?: string;
  expertise: string[];
  courseCount: number;
  rating: number;
  followersCount?: number;
  socialLinks?: Array<{
    platform: string;
    url: string;
    icon?: React.ReactNode;
  }>;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number;
  enrollmentCount: number;
  price: number;
  currency: string;
  progress?: number;
  isEnrolled?: boolean;
}

interface InstructorProfileProps {
  instructor: Instructor;
  otherCourses: Course[];
  communitySlug?: string;
  onFollow?: (instructorId: string, follow: boolean) => Promise<void>;
  className?: string;
}

const InstructorProfile: React.FC<InstructorProfileProps> = ({
  instructor,
  otherCourses,
  communitySlug,
  onFollow,
  className = '',
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (!onFollow) return;
    setIsLoading(true);
    try {
      await onFollow(instructor.id, !isFollowing);
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          fill={i <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      );
    }
    return stars;
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-6">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6 space-y-4 md:space-y-0">
          <div className="flex-shrink-0">
            {instructor.avatarUrl ? (
              <Image
                src={instructor.avatarUrl}
                alt={`${instructor.name}'s avatar`}
                width={100}
                height={100}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
              {instructor.name}
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center space-x-1">
                {renderStars(instructor.rating)}
                <span className="ml-1">({instructor.rating.toFixed(1)})</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4" />
                <span>{instructor.courseCount} courses</span>
              </div>
              {instructor.followersCount && (
                <span>{instructor.followersCount} followers</span>
              )}
            </div>
            <Button
              onClick={handleFollow}
              disabled={isLoading}
              variant={isFollowing ? 'secondary' : 'default'}
              className="w-full md:w-auto"
            >
              {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {instructor.bio && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">About {instructor.name}</h3>
            <p className="text-gray-600 leading-relaxed">{instructor.bio}</p>
          </div>
        )}
        {instructor.credentials && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Credentials</h3>
            <p className="text-gray-600">{instructor.credentials}</p>
          </div>
        )}
        {instructor.expertise.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {instructor.expertise.map((expertise) => (
                <Badge key={expertise} variant="secondary" className="text-xs">
                  {expertise}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {instructor.socialLinks && instructor.socialLinks.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Connect</h3>
            <div className="flex space-x-4">
              {instructor.socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                >
                  {link.icon || link.platform}
                </a>
              ))}
            </div>
          </div>
        )}
        {otherCourses.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">
              Other courses by {instructor.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  communitySlug={communitySlug || ''}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { InstructorProfile };
export default InstructorProfile;