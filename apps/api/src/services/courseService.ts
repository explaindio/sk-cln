import { prisma } from '../lib/prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { notificationService } from './notification.service';

export class CourseService {
  async getCourses(options: {
    communityId?: string;
    search?: string;
    difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    minDuration?: number;
    maxDuration?: number;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}) {
    const {
      communityId,
      search,
      difficulty,
      minDuration,
      maxDuration,
      tags,
      limit = 20,
      offset = 0
    } = options;

    const where: any = {
      isPublished: true,
      ...(communityId && { communityId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(difficulty && { difficulty }),
      ...(minDuration !== undefined || maxDuration !== undefined ? {
        duration: {
          ...(minDuration !== undefined && { gte: minDuration }),
          ...(maxDuration !== undefined && { lte: maxDuration })
        }
      } : {}),
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } })
    };

    const courses = await prisma.course.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Compute instructor name
    return courses.map(course => ({
      ...course,
      instructor: {
        ...course.instructor,
        name: `${course.instructor.firstName || ''} ${course.instructor.lastName || ''}`.trim() || 'Unknown Instructor'
      },
      enrollmentCount: course._count.enrollments
    }));
  }

  async getCourse(courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        community: true,
        modules: {
          include: {
            lessons: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
        progress: {
          select: {
            id: true,
            progress: true,
            status: true,
            completedAt: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return course;
  }

  async createCourse(courseData: {
    communityId: string;
    title: string;
    description?: string;
    thumbnail?: string;
    difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    price?: number;
    modules?: Array<{
      title: string;
      description?: string;
      lessons: Array<{
        title: string;
        description?: string;
        contentType: string;
        content?: string;
        videoUrl?: string;
        duration?: number;
        isFree?: boolean;
      }>;
    }>;
  }) {
    const { modules, ...courseFields } = courseData;

    return prisma.course.create({
      data: {
        ...courseFields,
        modules: {
          create: modules?.map((module, moduleIndex) => ({
            title: module.title,
            description: module.description,
            position: moduleIndex,
            lessons: {
              create: module.lessons.map((lesson, lessonIndex) => ({
                title: lesson.title,
                description: lesson.description,
                contentType: lesson.contentType,
                contentUrl: lesson.videoUrl,
                contentText: lesson.content,
                duration: lesson.duration,
                isFree: lesson.isFree || false,
                position: lessonIndex,
              })),
            },
          })) || [],
        },
      },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });
  }

  async updateCourse(courseId: string, updateData: Partial<{
    title: string;
    description: string;
    thumbnail: string;
    isPublished: boolean;
    position: number;
  }>) {
    return prisma.course.update({
      where: { id: courseId },
      data: updateData,
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });
  }

  async deleteCourse(courseId: string) {
    // First delete all related data
    await prisma.userProgress.deleteMany({
      where: { courseId },
    });

    await prisma.lesson.deleteMany({
      where: {
        module: {
          courseId,
        },
      },
    });

    await prisma.courseModule.deleteMany({
      where: { courseId },
    });

    return prisma.course.delete({
      where: { id: courseId },
    });
  }

  async getCourseModules(courseId: string) {
    return prisma.courseModule.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async createModule(courseId: string, moduleData: {
    title: string;
    description?: string;
    lessons: Array<{
      title: string;
      description?: string;
      contentType: string;
      content?: string;
      videoUrl?: string;
      duration?: number;
      isFree?: boolean;
    }>;
  }) {
    // Get the highest position number for this course
    const lastModule = await prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { position: 'desc' },
    });

    const position = lastModule ? lastModule.position + 1 : 0;

    return prisma.courseModule.create({
      data: {
        courseId,
        title: moduleData.title,
        description: moduleData.description,
        position,
        lessons: {
          create: moduleData.lessons.map((lesson, lessonIndex) => ({
            title: lesson.title,
            description: lesson.description,
            contentType: lesson.contentType,
            contentUrl: lesson.videoUrl,
            contentText: lesson.content,
            duration: lesson.duration,
            isFree: lesson.isFree || false,
            position: lessonIndex,
          })),
        },
      },
      include: {
        lessons: true,
      },
    });
  }

  async updateLesson(lessonId: string, updateData: Partial<{
    title: string;
    description: string;
    contentText: string;
    contentUrl: string;
    duration: number;
    isFree: boolean;
  }>) {
    return prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    });
  }

  async getLesson(lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                community: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    return lesson;
  }

  async enrollInCourse(userId: string, courseId: string) {
    // Check if already enrolled
    const existingProgress = await prisma.userProgress.findFirst({
      where: {
        userId,
        courseId,
        lessonId: null, // Course-level progress
      },
    });

    if (existingProgress) {
      throw new BadRequestError('Already enrolled in this course');
    }

    const enrollment = await prisma.userProgress.create({
      data: {
        userId,
        courseId,
        status: 'not_started',
        startedAt: new Date(),
      },
    });

    // Send notification for course enrollment
    await notificationService.notifyCourseEnrolled(courseId, userId);

    return enrollment;
  }

  async markLessonComplete(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: true,
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const result = await prisma.userProgress.upsert({
      where: {
        userId_courseId_lessonId: {
          userId,
          courseId: lesson.module.courseId,
          lessonId,
        },
      },
      update: {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
      },
      create: {
        userId,
        courseId: lesson.module.courseId,
        lessonId,
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
      },
    });

    // Check if there's a next lesson and notify user
    const nextLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: lesson.moduleId,
        position: {
          gt: lesson.position,
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    if (nextLesson) {
      await notificationService.notifyLessonAvailable(lesson.module.courseId, nextLesson.id, userId);
    }

    return result;
  }

  async updateVideoProgress(userId: string, lessonId: string, progress: number) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: true,
      },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    // If lesson was completed, check if there's a next lesson and notify user
    if (progress >= 100) {
      const nextLesson = await prisma.lesson.findFirst({
        where: {
          moduleId: lesson.moduleId,
          position: {
            gt: lesson.position,
          },
        },
        orderBy: {
          position: 'asc',
        },
      });

      if (nextLesson) {
        await notificationService.notifyLessonAvailable(lesson.module.courseId, nextLesson.id, userId);
      }
    }

    return prisma.userProgress.upsert({
      where: {
        userId_courseId_lessonId: {
          userId,
          courseId: lesson.module.courseId,
          lessonId,
        },
      },
      update: {
        progress,
        status: progress >= 100 ? 'completed' : 'in_progress',
        completedAt: progress >= 100 ? new Date() : undefined,
      },
      create: {
        userId,
        courseId: lesson.module.courseId,
        lessonId,
        progress,
        status: progress >= 100 ? 'completed' : 'in_progress',
        completedAt: progress >= 100 ? new Date() : undefined,
      },
    });
  }

  async getCourseProgress(userId: string, courseId: string) {
    return prisma.userProgress.findMany({
      where: {
        userId,
        courseId,
      },
      include: {
        lesson: {
          include: {
            module: true,
          },
        },
        course: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

export const courseService = new CourseService();