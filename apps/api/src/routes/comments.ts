import { Router } from 'express';
import { commentController } from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import { param } from 'express-validator';
import {
  validateCreateComment,
  validateUpdateComment,
  validateReportComment,
  validateModerateComment,
  handleValidationErrors
} from '../middleware/validation';

const router: Router = Router();

// Parameter validation middleware
const validateCommentId = [
  param('id').isUUID().withMessage('Valid comment ID is required'),
  handleValidationErrors,
];

const validatePostId = [
  param('postId').isUUID().withMessage('Valid post ID is required'),
  handleValidationErrors,
];

// All comment routes require authentication
router.use(authenticate);

// Create a new comment
router.post('/', validateCreateComment, commentController.create);

// Get comments for a post
router.get('/post/:postId', validatePostId, commentController.listByPost);

// Update a comment
router.put('/:id', validateCommentId, validateUpdateComment, commentController.update);

// Delete a comment
router.delete('/:id', validateCommentId, commentController.delete);

// Reply to a comment
router.post('/:id/reply', validateCommentId, validateCreateComment, commentController.reply);

// Report a comment
router.post('/:id/report', validateCommentId, validateReportComment, commentController.report);

// Moderate a comment
router.post('/:id/moderate', validateCommentId, validateModerateComment, commentController.moderate);

export default router;