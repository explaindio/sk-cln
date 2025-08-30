import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';

/**
 * Middleware to check if a user has permission to access a file
 */
export const checkFileAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    // If no fileId in params, proceed to next middleware
    if (!fileId) {
      return next();
    }

    // Find the file
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // If the user is the owner, allow access
    if (file.userId === userId) {
      (req as any).file = file;
      return next();
    }

    // If the file is public, allow access
    if (file.isPublic) {
      (req as any).file = file;
      return next();
    }

    // For private files, check access level
    if (file.accessLevel === 'private') {
      throw new ForbiddenError('You do not have permission to access this file');
    }

    // For shared files, check if user has been granted access
    if (file.accessLevel === 'shared') {
      const sharedAccess = await prisma.fileShare.findFirst({
        where: {
          fileId: file.id,
          userId: userId,
          status: 'active',
        },
      });

      if (!sharedAccess) {
        throw new ForbiddenError('You do not have permission to access this file');
      }

      (req as any).file = file;
      (req as any).fileShare = sharedAccess;
      return next();
    }

    // Default deny
    throw new ForbiddenError('You do not have permission to access this file');
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate file upload access control parameters
 */
export const validateFileUploadAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isPublic, accessLevel } = req.body;

    // Validate accessLevel if provided
    if (accessLevel) {
      const validAccessLevels = ['private', 'shared', 'public'];
      if (!validAccessLevels.includes(accessLevel)) {
        throw new Error('Invalid access level. Must be one of: private, shared, public');
      }
    }

    // If isPublic is true, accessLevel should be 'public'
    if (isPublic === true && accessLevel && accessLevel !== 'public') {
      throw new Error('When isPublic is true, accessLevel must be "public"');
    }

    next();
  } catch (error) {
    next(error);
  }
};