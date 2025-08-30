'use client';

import { useState } from 'react';
import { useCreateCourse } from '../../hooks/useCourses';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ImageUpload } from '../upload/ImageUpload';
import { Plus, GripVertical, X, Video, FileText, HelpCircle, Edit } from 'lucide-react';
import React from 'react';

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  content?: string;
  videoUrl?: string;
  duration?: number;
  isPreview: boolean;
}

interface CourseBuilderProps {
  communityId: string;
  onSuccess?: (course: any) => void;
}

export function CourseBuilder({ communityId, onSuccess }: CourseBuilderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [price, setPrice] = useState(0);
  const [modules, setModules] = useState<Module[]>([]);

  const createCourse = useCreateCourse();

  const addModule = () => {
    const newModule: Module = {
      id: Date.now().toString(),
      title: '',
      description: '',
      lessons: [],
    };
    setModules([...modules, newModule]);
  };

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setModules(modules.map(m =>
      m.id === moduleId ? { ...m, ...updates } : m
    ));
  };

  const removeModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId));
  };

  const addLesson = (moduleId: string) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: '',
      type: 'VIDEO',
      isPreview: false,
    };

    setModules(modules.map(m =>
      m.id === moduleId
        ? { ...m, lessons: [...m.lessons, newLesson] }
        : m
    ));
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    setModules(modules.map(m =>
      m.id === moduleId
        ? {
            ...m,
            lessons: m.lessons.map(l =>
              l.id === lessonId ? { ...l, ...updates } : l
            ),
          }
        : m
    ));
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules(modules.map(m =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
        : m
    ));
  };

  const handleSubmit = async () => {
    const courseData = {
      title,
      description,
      thumbnail,
      difficulty,
      price,
      communityId,
      modules: modules.map((module, moduleIndex) => ({
        ...module,
        order: moduleIndex,
        lessons: module.lessons.map((lesson, lessonIndex) => ({
          ...lesson,
          order: lessonIndex,
        })),
      })),
    };

    const course = await createCourse.mutateAsync(courseData);
    onSuccess?.(course);
  };

  const getLessonIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'VIDEO': return Video;
      case 'TEXT': return FileText;
      case 'QUIZ': return HelpCircle;
      case 'ASSIGNMENT': return Edit;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Course Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter course title"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe your course..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            <Input
              label="Price ($)"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0 for free"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Thumbnail
            </label>
            <ImageUpload
              currentImage={thumbnail}
              onUpload={setThumbnail}
              aspectRatio="16:9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Course Content</CardTitle>
            <Button size="sm" onClick={addModule}>
              <Plus className="h-4 w-4 mr-1" />
              Add Module
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No modules added yet. Click "Add Module" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {modules.map((module, moduleIndex) => (
                <div key={module.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2 flex-1">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => updateModule(module.id, { title: e.target.value })}
                        placeholder={`Module ${moduleIndex + 1} title`}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <button
                      onClick={() => removeModule(module.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="ml-7 space-y-2">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const LessonIcon = getLessonIcon(lesson.type);
                      return (
                        <div key={lesson.id} className="flex items-center space-x-2">
                          <LessonIcon className="h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) => updateLesson(module.id, lesson.id, { title: e.target.value })}
                            placeholder={`Lesson ${lessonIndex + 1} title`}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <select
                            value={lesson.type}
                            onChange={(e) => updateLesson(module.id, lesson.id, { type: e.target.value as any })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="VIDEO">Video</option>
                            <option value="TEXT">Text</option>
                            <option value="QUIZ">Quiz</option>
                            <option value="ASSIGNMENT">Assignment</option>
                          </select>
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={lesson.isPreview}
                              onChange={(e) => updateLesson(module.id, lesson.id, { isPreview: e.target.checked })}
                              className="mr-1"
                            />
                            Preview
                          </label>
                          <button
                            onClick={() => removeLesson(module.id, lesson.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => addLesson(module.id)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      + Add Lesson
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button variant="outline">Save as Draft</Button>
        <Button
          onClick={handleSubmit}
          isLoading={createCourse.isPending}
          disabled={!title || modules.length === 0}
        >
          Publish Course
        </Button>
      </div>
    </div>
  );
}