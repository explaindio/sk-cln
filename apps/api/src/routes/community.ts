import { Router, Request, Response } from 'express';
import { communityController } from '../controllers/communityController';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

const router: Router = Router();

const validateCommunity = [
  body('name').isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('slug').matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, and hyphens'),
  body('description').optional().isLength({ max: 500 }),
  handleValidationErrors,
];

router.post('/', authenticate, validateCommunity, (req: Request, res: Response) =>
  communityController.create(req, res));
router.get('/', (req: Request, res: Response) => communityController.list(req, res));
router.get('/:slug', (req: Request, res: Response) => communityController.getBySlug(req, res));

// Community settings
router.patch('/:communityId/settings', authenticate, (req: Request, res: Response) =>
  communityController.updateSettings(req, res));

// Community members
router.get('/:communityId/members', authenticate, (req: Request, res: Response) =>
  communityController.getMembers(req, res));
router.get('/:communityId/members/search', authenticate, (req: Request, res: Response) =>
  communityController.searchMembers(req, res));
router.patch('/:communityId/members/:userId/role', authenticate, (req: Request, res: Response) =>
  communityController.updateMemberRole(req, res));

export default router;