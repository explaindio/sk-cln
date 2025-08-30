import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { userController } from '../controllers/userController';
import { validateChangePassword } from '../middleware/validation';

const router: Router = Router();

router.get('/me', authenticate, (req: AuthRequest, res: Response) => res.json(req.user));
router.get('/me/communities', authenticate, (req: Request, res: Response) =>
  userController.getUserCommunities(req, res));
router.put('/me', authenticate, (req: Request, res: Response) =>
  userController.updateProfile(req, res));
router.post('/me/change-password', authenticate, validateChangePassword, (req: AuthRequest, res: Response) =>
  userController.changePassword(req, res));
// router.get('/me/preferences', authenticate, (req, res) =>
//   userController.getUserPreferences(req, res));
// router.patch('/me/preferences', authenticate, (req, res) =>
//   userController.updateUserPreferences(req, res));
router.get('/profile/:username', (req: Request, res: Response) =>
  userController.getProfile(req, res));
router.get('/search', authenticate, (req: Request, res: Response) =>
  userController.searchUsers(req, res));

export default router;