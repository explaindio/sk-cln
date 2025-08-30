import { Request, Response } from 'express';
import { BaseController } from './baseController';
import { memberService } from '../services/memberService';
import { AuthRequest } from '../middleware/auth';

class MemberController extends BaseController {
  async joinCommunity(req: AuthRequest, res: Response) {
    try {
      const { communityId } = req.params;
      
      const member = await memberService.joinCommunity(communityId, req.user.id);
      
      this.sendSuccess(res, member, 201);
    } catch (error: any) {
      if (error.message === 'Already a member') {
        return this.sendError(res, 'Already a member', 409);
      }
      this.sendError(res, 'Failed to join community', 500);
    }
  }

  async leaveCommunity(req: AuthRequest, res: Response) {
    try {
      const { communityId } = req.params;
      
      // Check if user is owner
      const memberRole = await memberService.getMemberRole(communityId, req.user.id);
      if (memberRole === 'owner') {
        return this.sendError(res, 'Owner cannot leave community', 40);
      }
      
      const member = await memberService.leaveCommunity(communityId, req.user.id);
      
      this.sendSuccess(res, member);
    } catch (error: any) {
      if (error.message === 'Member not found') {
        return this.sendError(res, 'Not a member', 404);
      }
      this.sendError(res, 'Failed to leave community', 500);
    }
  }

  async getPendingInvitations(req: AuthRequest, res: Response) {
    try {
      const invitations = await memberService.getPendingInvitations(req.user.id);
      
      this.sendSuccess(res, invitations);
    } catch (error) {
      this.sendError(res, 'Failed to fetch invitations', 500);
    }
  }

  async acceptInvitation(req: AuthRequest, res: Response) {
    try {
      const { invitationId } = req.params;
      
      const member = await memberService.acceptInvitation(invitationId, req.user.id);
      
      this.sendSuccess(res, member);
    } catch (error: any) {
      if (error.message === 'Invitation functionality not implemented') {
        return this.sendError(res, 'Invitation functionality not implemented', 501);
      }
      this.sendError(res, 'Failed to accept invitation', 500);
    }
  }

  async declineInvitation(req: AuthRequest, res: Response) {
    try {
      const { invitationId } = req.params;
      
      await memberService.declineInvitation(invitationId);
      
      this.sendSuccess(res, { message: 'Invitation declined' });
    } catch (error: any) {
      if (error.message === 'Invitation functionality not implemented') {
        return this.sendError(res, 'Invitation functionality not implemented', 501);
      }
      this.sendError(res, 'Failed to decline invitation', 500);
    }
  }
}

export const memberController = new MemberController();