import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadImage } from '../middleware/upload.middleware';
import { courseController } from '../controllers/courseController';

const router = Router();

// All course routes require authentication
router.use(authenticate);

// Course CRUD operations
router.get('/', courseController.getCourses);
router.post('/', courseController.createCourse);
router.get('/:courseId', courseController.getCourse);
router.patch('/:courseId', courseController.updateCourse);
router.delete('/:courseId', courseController.deleteCourse);

// Course enrollment
router.post('/:courseId/enroll', courseController.enrollInCourse);

// Course progress
router.get('/:courseId/progress', courseController.getCourseProgress);

// Module operations
router.get('/:courseId/modules', courseController.getCourseModules);
router.post('/:courseId/modules', courseController.createModule);

// Lesson operations
router.get('/lessons/:lessonId', courseController.getLesson);
router.patch('/lessons/:lessonId', courseController.updateLesson);

// Lesson completion and progress
router.post('/lessons/:lessonId/complete', courseController.markLessonComplete);
router.post('/lessons/:lessonId/progress', courseController.updateVideoProgress);

// Video upload operations
router.post('/lessons/:lessonId/video/upload', uploadImage('video'), courseController.uploadVideo);
router.post('/lessons/:lessonId/video/presigned-url', courseController.getVideoUploadUrl);
router.post('/lessons/:lessonId/video/complete', courseController.completeVideoUpload);

// Multipart video upload operations
router.post('/lessons/:lessonId/video/multipart/initiate', courseController.initiateMultipartVideoUpload);
router.get('/lessons/:lessonId/video/multipart/:uploadId/part-url', courseController.getMultipartUploadUrl);
router.post('/lessons/:lessonId/video/multipart/:uploadId/complete', courseController.completeMultipartVideoUpload);
router.post('/lessons/:lessonId/video/multipart/:uploadId/abort', courseController.abortMultipartVideoUpload);

export default router;