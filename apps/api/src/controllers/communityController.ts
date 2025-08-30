import { Request, Response } from 'express';
import { BaseController } from './baseController';
import { communityService } from '../services/communityService';
import { memberService } from '../services/memberService';
import { AuthRequest } from '../middleware/auth';

class CommunityController extends BaseController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, slug, description, isPublic } = req.body;

      // Check if slug exists
      const existing = await communityService.findBySlug(slug);
      if (existing) {
        return this.sendError(res, 'Slug already exists', 409);
      }

      const community = await communityService.create({
        name,
        slug,
        description,
        isPublic,
        ownerId: req.user.id,
      });

      this.sendSuccess(res, community, 201);
    } catch (error) {
      this.sendError(res, 'Failed to create community', 500);
    }
  }

  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const community = await communityService.findBySlug(slug);

      if (!community) {
        return this.sendError(res, 'Community not found', 404);
      }

      this.sendSuccess(res, community);
    } catch (error) {
      this.sendError(res, 'Failed to fetch community', 500);
    }
  }

  async list(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { communities, total } = await communityService.listPublic(page, limit);

      this.sendPaginated(res, communities, page, limit, total);
    } catch (error) {
      this.sendError(res, 'Failed to fetch communities', 500);
    }
  }

  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const { name, description, isPublic, logoUrl, coverUrl, isPaid, priceMonthly, priceYearly } = req.body;

      // Check if user is owner or admin
      const memberRole = await memberService.getMemberRole(communityId, req.user.id);
      if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
        return this.sendError(res, 'Unauthorized', 403);
      }

      const community = await communityService.updateSettings(communityId, {
        name,
        description,
        isPublic,
        logoUrl,
        coverUrl,
        isPaid,
        priceMonthly,
        priceYearly,
      });

      this.sendSuccess(res, community);
    } catch (error) {
      this.sendError(res, 'Failed to update community settings', 500);
    }
  }

  async getMembers(req: AuthRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Check if user is member
      const isMember = await memberService.isMember(communityId, req.user.id);
      if (!isMember) {
        return this.sendError(res, 'Unauthorized', 403);
      }

      const { members, total } = await communityService.getMembers(communityId, page, limit);

      this.sendPaginated(res, members, page, limit, total);
    } catch (error) {
      this.sendError(res, 'Failed to fetch members', 500);
    }
  }

  async searchMembers(req: AuthRequest, res: Response) {
    try {
      const { communityId } = req.params;
      const { q } = req.query;
      const query = q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Check if user is member
      const isMember = await memberService.isMember(communityId, req.user.id);
      if (!isMember) {
        return this.sendError(res, 'Unauthorized', 403);
      }

      if (!query || query.length < 1) {
        return this.sendError(res, 'Query parameter is required', 400);
      }

      const { members, total } = await communityService.searchMembers(communityId, query, page, limit);

      this.sendPaginated(res, members, page, limit, total);
    } catch (error) {
      this.sendError(res, 'Failed to search members', 500);
    }
  }

  async updateMemberRole(req: AuthRequest, res: Response) {
    try {
      const { communityId, userId } = req.params;
      const { role } = req.body;

      // Check if user is owner or admin
      const requesterRole = await memberService.getMemberRole(communityId, req.user.id);
      if (!requesterRole || (requesterRole !== 'owner' && requesterRole !== 'admin')) {
        return this.sendError(res, 'Unauthorized', 403);
      }

      // Owner can only be changed by themselves
      if (requesterRole === 'admin' && role === 'owner') {
        return this.sendError(res, 'Only owner can assign owner role', 403);
      }

      const updatedMember = await memberService.updateMemberRole(communityId, userId, role);

      this.sendSuccess(res, updatedMember);
    } catch (error: any) {
      if (error.message === 'Member not found') {
        return this.sendError(res, 'Member not found', 404);
      }
      if (error.message === 'Invalid role') {
        return this.sendError(res, 'Invalid role', 400);
      }
      if (error.message === 'Cannot change owner role') {
        return this.sendError(res, 'Cannot change owner role', 403);
      }
      this.sendError(res, 'Failed to update member role', 500);
    }
  }
}

export const communityController = new CommunityController();