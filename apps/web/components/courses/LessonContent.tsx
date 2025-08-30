'use client';

import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { RichTextEditor } from '../editor/RichTextEditor';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { CheckCircle, FileText, Video, HelpCircle, Edit } from 'lucide-react';

interface LessonContentProps {
  lesson: {
    id: string;
    title: string;
    description?: string;
    type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
    content?: string;
    videoUrl?: string;
    duration?: number;
    completed?: boolean;
  };
  onComplete: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function LessonContent({
  lesson,
  onComplete,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: LessonContentProps) {
  const [isCompleted, setIsCompleted] = useState(lesson.completed || false);

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  const renderContent = () => {
    switch (lesson.type) {
      case 'VIDEO':
        return (
          <div className="space-y-4">
            {lesson.videoUrl && (
              <VideoPlayer
                src={lesson.videoUrl}
                onComplete={handleComplete}
              />
            )}
            {lesson.description && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">About this lesson</h3>
                  <p className="text-sm text-gray-600">{lesson.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'TEXT':
        return (
          <Card>
            <CardContent className="p-6">
              {lesson.content && (
                <RichTextEditor
                  content={lesson.content}
                  editable={false}
                />
              )}
            </CardContent>
          </Card>
        );

      case 'QUIZ':
        return (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <HelpCircle className="h-5 w-5 text-primary-600" />
                <h3 className="font-medium">Quiz</h3>
              </div>
              <p className="text-gray-600 mb-4">{lesson.description}</p>
              {/* Quiz implementation would go here */}
              <Button onClick={handleComplete}>
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        );

      case 'ASSIGNMENT':
        return (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Edit className="h-5 w-5 text-primary-600" />
                <h3 className="font-medium">Assignment</h3>
              </div>
              <p className="text-gray-600 mb-4">{lesson.description}</p>
              {lesson.content && (
                <div className="mb-4">
                  <RichTextEditor
                    content={lesson.content}
                    editable={false}
                  />
                </div>
              )}
              <Button onClick={handleComplete}>
                Submit Assignment
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const getLessonIcon = () => {
    switch (lesson.type) {
      case 'VIDEO': return Video;
      case 'TEXT': return FileText;
      case 'QUIZ': return HelpCircle;
      case 'ASSIGNMENT': return Edit;
    }
  };

  const LessonIcon = getLessonIcon();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LessonIcon className="h-6 w-6 text-gray-500" />
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {isCompleted && (
            <CheckCircle className="h-6 w-6 text-green-600" />
          )}
        </div>

        {!isCompleted && lesson.type !== 'QUIZ' && lesson.type !== 'ASSIGNMENT' && (
          <Button onClick={handleComplete}>
            Mark as Complete
          </Button>
        )}
      </div>

      {renderContent()}

      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          Previous Lesson
        </Button>

        <Button
          onClick={onNext}
          disabled={!hasNext}
        >
          Next Lesson
        </Button>
      </div>
    </div>
  );
}