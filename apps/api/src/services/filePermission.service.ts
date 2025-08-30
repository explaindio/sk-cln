import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export class FilePermissionService {
  /**
   * Check if a user has permission to access a file
   */
  async checkFileAccess(userId: string, fileId: string): Promise<boolean> {
    try {
      // Find the file
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError('File not found');
      }

      // If the user is the owner, allow access
      if (file.userId === userId) {
        return true;
      }

      // If the file is public, allow access
      if (file.isPublic) {
        return true;
      }

      // For private files, deny access
      if (file.accessLevel === 'private') {
        return false;
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

        return !!sharedAccess;
      }

      // Default deny
      return false;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get file with permission check
   */
  async getFileWithPermission(userId: string, fileId: string) {
    try {
      // Find the file
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError('File not found');
      }

      // Check permissions
      const hasAccess = await this.checkFileAccess(userId, fileId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have permission to access this file');
      }

      return file;
    } catch (error) {
      throw error;
    }
  }
}

export const filePermissionService = new FilePermissionService();