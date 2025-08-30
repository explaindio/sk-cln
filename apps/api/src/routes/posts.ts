import { Router } from 'express';
import { postController } from '../controllers/postController';
import { authenticate } from '../middleware/auth';
import { param } from 'express-validator';
import {
  validateCreatePost,
  validateUpdatePost,
  validateReportPost,
  validateModeratePost,
  handleValidationErrors
} from '../middleware/validation';

const router: Router = Router();

// Parameter validation middleware
const validatePostId = [
  param('id').isUUID().withMessage('Valid post ID is required'),
  handleValidationErrors,
];

const validateCommunityId = [
  param('communityId').isUUID().withMessage('Valid community ID is required'),
  handleValidationErrors,
];

// All routes require authentication
router.use(authenticate);

// Routes with comprehensive validation
router.post('/', validateCreatePost, postController.create);
router.get('/community/:communityId', validateCommunityId, postController.listByCommunity);
router.get('/:id', validatePostId, postController.getById);
router.put('/:id', validatePostId, validateUpdatePost, postController.update);
router.delete('/:id', validatePostId, postController.delete);
router.post('/:id/report', validatePostId, validateReportPost, postController.report);
router.post('/:id/moderate', validatePostId, validateModeratePost, postController.moderate);

export default router;