import { Router } from 'express';
import { postController } from '../controllers/postController';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

const router: Router = Router();

const validatePost = [
  body('title').isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 characters'),
  body('content').isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('communityId').isUUID().withMessage('Invalid community ID'),
  body('categoryId').isUUID().withMessage('Invalid category ID'),
  handleValidationErrors,
];

const validateReport = [
  body('reason').isLength({ min: 1 }).withMessage('Reason is required'),
  handleValidationErrors,
];

const validateModeration = [
  body('action').isIn(['APPROVE', 'REJECT', 'DELETE', 'EDIT', 'WARN']).withMessage('Invalid action'),
  handleValidationErrors,
];

router.post('/', authenticate, validatePost, postController.create);
router.get('/:id', postController.getById);
router.get('/community/:communityId', postController.listByCommunity);
router.put('/:id', authenticate, postController.update);
router.delete('/:id', authenticate, postController.delete);
router.post('/:id/report', authenticate, validateReport, postController.report);
router.post('/:id/moderate', authenticate, validateModeration, postController.moderate);

export default router;