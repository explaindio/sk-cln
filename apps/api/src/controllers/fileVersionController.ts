import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { fileVersionService } from '../services/fileVersion.service';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { uploadSingle } from '../middleware/upload.middleware';

export const fileVersionController = {
  /**
   * Get all versions of a file
   */
  async getFileVersions(req: AuthRequest, res: Response) {
    try {
      const { fileId } = req.params;
      const userId = req.user!.id;

      if (!fileId) {
        throw new BadRequestError('File ID is required');
      }

      const versions = await fileVersionService.getFileVersions(userId, fileId);

      res.json(versions);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new version of a file
   */
  async createFileVersion(req: AuthRequest, res: Response) {
    try {
      // First handle file upload
      await new Promise<void>((resolve, reject) => {
        uploadSingle('file')(req, res, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      const { fileId } = req.params;
      const userId = req.user!.id;
      const { isPublic, accessLevel, tags, description } = req.body;

      if (!fileId) {
        throw new BadRequestError('File ID is required');
      }

      if (!req.file) {
        throw new BadRequestError('No file provided');
      }

      const newVersion = await fileVersionService.createFileVersion(
        userId,
        fileId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        isPublic || false,
        accessLevel || 'private',
        tags || [],
        description || null
      );

      res.json(newVersion);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Restore a specific version of a file
   */
  async restoreFileVersion(req: AuthRequest, res: Response) {
    try {
      const { fileId, versionId } = req.params;
      const userId = req.user!.id;

      if (!fileId || !versionId) {
        throw new BadRequestError('File ID and version ID are required');
      }

      const restoredFile = await fileVersionService.restoreFileVersion(userId, fileId, versionId);

      res.json(restoredFile);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a specific version of a file
   */
  async deleteFileVersion(req: AuthRequest, res: Response) {
    try {
      const { fileId, versionId } = req.params;
      const userId = req.user!.id;

      if (!fileId || !versionId) {
        throw new BadRequestError('File ID and version ID are required');
      }

      const result = await fileVersionService.deleteFileVersion(userId, fileId, versionId);

      res.json(result);
    } catch (error) {
      throw error;
    }
  },
};