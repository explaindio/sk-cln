import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { fileVersionController } from '../controllers/fileVersionController';
import { validateFileVersion } from '../middleware/validation';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// All file version routes require authentication
router.use(authenticate);

// Get all versions of a file
router.get('/:fileId/versions', fileVersionController.getFileVersions);

// Create a new version of a file
router.post('/:fileId/versions', validateFileVersion, fileVersionController.createFileVersion);

// Restore a specific version of a file
router.post('/:fileId/versions/:versionId/restore', fileVersionController.restoreFileVersion);

// Delete a specific version of a file
router.delete('/:fileId/versions/:versionId', fileVersionController.deleteFileVersion);

export default router;