import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { memberController } from '../controllers/memberController';

const router: Router = Router();

// Community membership
router.post('/communities/:communityId/join', authenticate, (req, res) =>
  memberController.joinCommunity(req, res));
router.post('/communities/:communityId/leave', authenticate, (req, res) =>
  memberController.leaveCommunity(req, res));

// Community invitations
router.get('/invitations', authenticate, (req, res) =>
  memberController.getPendingInvitations(req, res));
router.post('/invitations/:invitationId/accept', authenticate, (req, res) =>
  memberController.acceptInvitation(req, res));
router.post('/invitations/:invitationId/decline', authenticate, (req, res) =>
  memberController.declineInvitation(req, res));

export default router;