import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { courseService } from '../services/courseService';
import { s3Service } from '../services/s3.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

export const courseController = {
  async getCourses(req: Request, res: Response) {
    const {
      communityId,
      search,
      difficulty,
      minDuration,
      maxDuration,
      tags,
      page = 1,
      limit = 20
    } = req.query;

    const options = {
      communityId: communityId as string,
      search: search as string,
      difficulty: (difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'),
      minDuration: minDuration ? parseInt(minDuration as string) : undefined,
      maxDuration: maxDuration ? parseInt(maxDuration as string) : undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      offset: ((page as number) - 1) * (limit as number),
      limit: parseInt(limit as string)
    };

    const courses = await courseService.getCourses(options);

    // Log search query if search or filters are used
    if (search || difficulty || minDuration || maxDuration || tags) {
      const userId = (req as any).user?.id;
      await prisma.searchQuery.create({
        data: {
          userId: userId || null,
          query: search as string || '',
          filters: {
            difficulty,
            minDuration,
            maxDuration,
            tags: tags ? (tags as string).split(',') : [],
            communityId
          },
          page: parseInt(page as string),
          resultsCount: courses.length,
          took: 0 // Could measure actual time
        }
      });
    }

    res.json({
      courses,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: courses.length // For full count, would need separate query
      }
    });
  },

  async getCourse(req: Request, res: Response) {
    const { courseId } = req.params;
    const course = await courseService.getCourse(courseId);
    res.json(course);
  },

  async createCourse(req: Request, res: Response) {
    const courseData = {
      ...req.body,
      communityId: req.body.communityId,
    };

    const course = await courseService.createCourse(courseData);
    res.status(201).json(course);
  },

  async updateCourse(req: Request, res: Response) {
    const { courseId } = req.params;
    const updateData = req.body;

    const course = await courseService.updateCourse(courseId, updateData);
    res.json(course);
  },

  async deleteCourse(req: Request, res: Response) {
    const { courseId } = req.params;
    await courseService.deleteCourse(courseId);
    res.json({ message: 'Course deleted successfully' });
  },

  async getCourseModules(req: Request, res: Response) {
    const { courseId } = req.params;
    const modules = await courseService.getCourseModules(courseId);
    res.json(modules);
  },

  async createModule(req: Request, res: Response) {
    const { courseId } = req.params;
    const moduleData = req.body;

    const module = await courseService.createModule(courseId, moduleData);
    res.status(201).json(module);
  },

  async getLesson(req: Request, res: Response) {
    const { lessonId } = req.params;
    const lesson = await courseService.getLesson(lessonId);
    res.json(lesson);
  },

  async updateLesson(req: Request, res: Response) {
    const { lessonId } = req.params;
    const updateData = req.body;

    const lesson = await courseService.updateLesson(lessonId, updateData);
    res.json(lesson);
  },

  async uploadVideo(req: AuthRequest, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No video file provided');
    }

    const { lessonId } = req.params;

    // Validate video file type
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedVideoTypes.includes(req.file.mimetype)) {
      throw new BadRequestError('Invalid video file type. Supported formats: MP4, WebM, OGG, MOV');
    }

    // Validate file size (500MB limit for videos)
    const maxVideoSize = 500 * 1024 * 1024; // 500MB
    if (req.file.size > maxVideoSize) {
      throw new BadRequestError('Video file size too large. Maximum size: 500MB');
    }

    try {
      // Upload to S3
      const key = `videos/${req.user!.id}/${Date.now()}-${req.file.originalname}`;
      const upload = await s3Service.uploadFile(req.file, key, 'private');

      // Update lesson with video information
      const lesson = await courseService.updateLesson(lessonId, {
        contentUrl: upload.url,
      });

      res.json({
        lesson,
        video: {
          url: upload.url,
          key: upload.key,
          size: req.file.size,
        },
      });
    } catch (error) {
      throw new BadRequestError('Failed to upload video');
    }
  },

  async getVideoUploadUrl(req: AuthRequest, res: Response) {
    const { lessonId } = req.params;
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      throw new BadRequestError('File name and type are required');
    }

    // Validate video file type
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedVideoTypes.includes(fileType)) {
      throw new BadRequestError('Invalid video file type. Supported formats: MP4, WebM, OGG, MOV');
    }

    const key = `videos/${req.user!.id}/${Date.now()}-${fileName}`;

    try {
      const presignedData = await s3Service.getPresignedUploadUrl(
        key,
        fileType,
        'private',
        3600 // 1 hour expiration
      );

      res.json({
        uploadUrl: presignedData.uploadUrl,
        key: presignedData.key,
        lessonId,
      });
    } catch (error) {
      throw new BadRequestError('Failed to generate upload URL');
    }
  },

  async completeVideoUpload(req: Request, res: Response) {
    const { lessonId } = req.params;
    const { key, size } = req.body;

    if (!key) {
      throw new BadRequestError('Video key is required');
    }

    try {
      // Verify the file exists in S3
      const exists = await s3Service.fileExists(key, 'private');
      if (!exists) {
        throw new BadRequestError('Video file not found in storage');
      }

      // Update lesson with video information
      const lesson = await courseService.updateLesson(lessonId, {
        contentUrl: `https://${process.env.AWS_S3_PRIVATE_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      });

      res.json({
        lesson,
        video: {
          url: lesson.contentUrl,
          key: key,
          size: size,
        },
      });
    } catch (error) {
      throw new BadRequestError('Failed to complete video upload');
    }
  },

  async initiateMultipartVideoUpload(req: AuthRequest, res: Response) {
    const { lessonId } = req.params;
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType) {
      throw new BadRequestError('File name and type are required');
    }

    // Validate video file type
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedVideoTypes.includes(fileType)) {
      throw new BadRequestError('Invalid video file type. Supported formats: MP4, WebM, OGG, MOV');
    }

    // Validate file size (max 2GB for multipart upload)
    const maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (fileSize && fileSize > maxFileSize) {
      throw new BadRequestError('Video file size too large. Maximum size: 2GB');
    }

    const key = `videos/${req.user!.id}/${Date.now()}-${fileName}`;

    try {
      const multipartData = await s3Service.initiateMultipartUpload(
        key,
        fileType,
        'private'
      );

      res.json({
        ...multipartData,
        lessonId,
        chunkSize: 8 * 1024 * 1024, // 8MB chunks
      });
    } catch (error) {
      throw new BadRequestError('Failed to initiate multipart upload');
    }
  },

  async getMultipartUploadUrl(req: AuthRequest, res: Response) {
    const { lessonId, uploadId } = req.params;
    const { partNumber } = req.query;

    if (!uploadId || !partNumber) {
      throw new BadRequestError('Upload ID and part number are required');
    }

    const partNum = parseInt(partNumber as string, 10);
    if (isNaN(partNum) || partNum < 1 || partNum > 10000) {
      throw new BadRequestError('Invalid part number');
    }

    // For now, we'll use a generic key format. In production, you might want to store this mapping
    const key = `videos/${req.user!.id}/multipart-${uploadId}`;

    try {
      const partData = await s3Service.getPresignedPartUrl(
        key,
        uploadId,
        partNum,
        'private'
      );

      res.json(partData);
    } catch (error) {
      throw new BadRequestError('Failed to generate part upload URL');
    }
  },

  async completeMultipartVideoUpload(req: Request, res: Response) {
    const { lessonId, uploadId } = req.params;
    const { parts, key, fileSize } = req.body;

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      throw new BadRequestError('Parts array is required');
    }

    if (!key) {
      throw new BadRequestError('Video key is required');
    }

    try {
      const result = await s3Service.completeMultipartUpload(
        key,
        uploadId,
        parts,
        'private'
      );

      // Update lesson with video information
      const lesson = await courseService.updateLesson(lessonId, {
        contentUrl: result.url,
      });

      res.json({
        lesson,
        video: {
          url: result.url,
          key: result.key,
          size: fileSize,
          etag: result.etag,
        },
      });
    } catch (error) {
      throw new BadRequestError('Failed to complete multipart upload');
    }
  },

  async abortMultipartVideoUpload(req: Request, res: Response) {
    const { lessonId, uploadId } = req.params;
    const { key } = req.body;

    if (!key) {
      throw new BadRequestError('Video key is required');
    }

    try {
      await s3Service.abortMultipartUpload(key, uploadId, 'private');
      res.json({ message: 'Multipart upload aborted successfully' });
    } catch (error) {
      throw new BadRequestError('Failed to abort multipart upload');
    }
  },

  async enrollInCourse(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const enrollment = await courseService.enrollInCourse(userId, courseId);
    res.status(201).json(enrollment);
  },

  async markLessonComplete(req: AuthRequest, res: Response) {
    const { lessonId } = req.params;
    const userId = req.user!.id;

    const progress = await courseService.markLessonComplete(userId, lessonId);
    res.json(progress);
  },

  async updateVideoProgress(req: AuthRequest, res: Response) {
    const { lessonId } = req.params;
    const { progress } = req.body;
    const userId = req.user!.id;

    if (progress < 0 || progress > 100) {
      throw new BadRequestError('Progress must be between 0 and 100');
    }

    const userProgress = await courseService.updateVideoProgress(userId, lessonId, progress);
    res.json(userProgress);
  },

  async getCourseProgress(req: AuthRequest, res: Response) {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const progress = await courseService.getCourseProgress(userId, courseId);
    res.json(progress);
  },
};