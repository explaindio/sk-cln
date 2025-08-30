import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadImage, uploadMultiple } from '../middleware/upload.middleware';
import { uploadController } from '../controllers/upload.controller';
import {
  validateFileUpload,
  validateBulkDelete,
  validateGetPresignedUrl
} from '../middleware/validation';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// Get files list
router.get('/', uploadController.getFiles);

// Get presigned upload URL
router.post('/presigned-url', validateGetPresignedUrl, uploadController.getPresignedUrl);

// Direct upload endpoints
router.post('/image', uploadImage('image'), uploadController.uploadImage);
router.post('/images', uploadMultiple('images', 5), uploadController.uploadImages);
router.post('/file', validateFileUpload, uploadImage('file'), uploadController.uploadFile);
router.post('/avatar', uploadImage('avatar'), uploadController.uploadAvatar);

// Delete file
router.delete('/file/:key', uploadController.deleteFile);

// Bulk delete files
router.post('/bulk-delete', validateBulkDelete, uploadController.bulkDeleteFiles);

// Permanently delete files
router.post('/permanent-delete', validateBulkDelete, uploadController.permanentlyDeleteFiles);

export default router;