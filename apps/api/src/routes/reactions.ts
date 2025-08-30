import { Router } from 'express';
import { reactionController } from '../controllers/reactionController';
import { authenticate } from '../middleware/auth';
import { param } from 'express-validator';
import { validateReaction, handleValidationErrors } from '../middleware/validation';

const router: Router = Router();

// Parameter validation middleware
const validateTargetParams = [
  param('targetType').isIn(['post', 'comment']).withMessage('Invalid target type'),
  param('targetId').isUUID().withMessage('Invalid target ID'),
  handleValidationErrors,
];

// All reaction routes require authentication
router.use(authenticate);

// Get available reaction types (public endpoint)
router.get('/types', reactionController.getAvailableTypes);

// Add or change reaction on a post or comment (new comprehensive method)
router.post('/', validateReaction, reactionController.addOrChange);

// Legacy toggle reaction endpoint for backwards compatibility
router.post('/toggle', validateReaction, reactionController.toggle);

// Get reaction stats for a post or comment
router.get('/stats/:targetType/:targetId', validateTargetParams, reactionController.getStats);

// Get reactions for a post or comment (with grouping by type)
router.get('/:targetType/:targetId', validateTargetParams, reactionController.list);

// Get user's reaction on a post or comment
router.get('/user/:targetType/:targetId', validateTargetParams, reactionController.getUserReaction);

export default router;