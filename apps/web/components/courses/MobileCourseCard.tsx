import React, { useState, useRef, HTMLAttributes } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '../../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowRight, Check, Play, Clock, Users, Lock } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    name: string;
  };
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number;
  enrollmentCount: number;
  price: number;
  currency: string;
  progress?: number;
  isEnrolled?: boolean;
}

interface MobileCourseCardProps extends HTMLAttributes<HTMLDivElement> {
  course: Course;
  communitySlug: string;
  onEnroll: (courseId: string) => void;
}

const MobileCourseCard: React.FC<MobileCourseCardProps> = ({ course, communitySlug, onEnroll, className, ...props }) => {
  const [touchStartX, setTouchStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
    setCurrentTranslate(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const touchCurrentX = e.touches[0].clientX;
    const diffX = touchCurrentX - touchStartX;
    if (diffX > 0 && cardRef.current) {
      const translate = Math.min(diffX, 120); // Max reveal 120px
      setCurrentTranslate(translate);
      cardRef.current.style.transform = `translateX(${translate}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const threshold = 80; // Enroll if swiped >80px
    if (currentTranslate > threshold) {
      onEnroll(course.id);
      // Snap to full reveal briefly then reset
      if (cardRef.current) {
        cardRef.current.style.transform = `translateX(120px)`;
        setTimeout(() => {
          if (cardRef.current) {
            cardRef.current.style.transform = 'translateX(0)';
          }
        }, 200);
      }
    } else {
      // Reset
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
      }
    }
    setCurrentTranslate(0);
  };

  const handleEnroll = () => {
    onEnroll(course.id);
  };

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
    <Card
      ref={cardRef}
      className={cn(
        'w-full max-w-sm mx-auto my-4 rounded-xl shadow-lg overflow-hidden relative', // Mobile-first: full width, rounded, shadow
        'min-h-[220px] md:min-h-[280px]', // Optimized height for mobile
        className
      )}
      {...props}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Optimized Image: Next/Image for better mobile perf */}
      <div className="relative aspect-video bg-gray-200 overflow-hidden">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Play className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {course.isEnrolled && course.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1">
            <div className="flex items-center justify-between text-white text-xs">
              <span>Progress</span>
              <span>{course.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
              <div
                className="bg-green-500 h-1 rounded-full"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}

        {course.price > 0 && !course.isEnrolled && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            {course.currency}{course.price}
          </div>
        )}
      </div>

      {/* Simplified Content Layout for Small Screens */}
      <CardHeader className="p-4 space-y-2"> {/* Reduced padding for mobile */}
        <CardTitle className="text-base font-semibold line-clamp-2 leading-tight"> {/* Smaller font, clamp for overflow */}
          {course.title}
        </CardTitle>
        <p className="text-sm text-gray-600">{course.instructor}</p>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3 relative"> {/* Touch-friendly spacing, relative for positioning */}
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        {/* Price and Enroll - Bottom for one-handed access */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-green-600">${course.price}</span>
          <Button
            onClick={handleEnroll}
            className="px-6 py-3 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700" // 44px+ touch target
            disabled={course.isEnrolled}
          >
            {course.isEnrolled ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Enrolled
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Enroll Now
              </>
            )}
          </Button>
        </div>

        {/* Swipe Reveal Background - Fixed enroll button under card */}
        {!course.isEnrolled && (
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-green-500 to-transparent flex items-center justify-center z-0">
            <Button
              onClick={handleEnroll}
              className="min-w-[80px] min-h-[44px] rounded-l-full bg-green-500 hover:bg-green-600 text-white font-semibold"
              size="sm"
            >
              Enroll →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { MobileCourseCard };