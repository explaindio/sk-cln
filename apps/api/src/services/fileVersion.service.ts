import { prisma } from '../lib/prisma';
import { s3Service } from './s3.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class FileVersionService {
  /**
   * Create a new version of a file
   */
  async createFileVersion(
    userId: string,
    originalFileId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    size: number,
    isPublic: boolean = false,
    accessLevel: string = 'private',
    tags: string[] = [],
    description: string | null = null
  ) {
    try {
      // Find the original file
      const originalFile = await prisma.file.findUnique({
        where: { id: originalFileId },
      });

      if (!originalFile) {
        throw new NotFoundError('Original file not found');
      }

      // Verify ownership
      if (originalFile.userId !== userId) {
        throw new BadRequestError('You do not have permission to create a version of this file');
      }

      // Generate a new key for the version
      const timestamp = Date.now();
      const key = `files/${userId}/${timestamp}-${originalName}`;
      
      // Upload the new version to S3
      const upload = await s3Service.uploadFile(
        { buffer: fileBuffer, originalname: originalName, mimetype: mimeType } as Express.Multer.File,
        key,
        isPublic ? 'public' : 'private'
      );

      // Create the new file version in the database
      const newVersion = await prisma.file.create({
        data: {
          userId: userId,
          originalName: originalName,
          mimeType: mimeType,
          size: size,
          key: upload.key,
          bucket: upload.bucket,
          url: upload.url,
          isPublic: isPublic,
          accessLevel: accessLevel,
          tags: tags,
          description: description,
          parentId: originalFileId,
          version: originalFile.version + 1,
        },
      });

      return newVersion;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all versions of a file
   */
  async getFileVersions(userId: string, fileId: string) {
    try {
      // Find the file and verify ownership
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError('File not found');
      }

      if (file.userId !== userId) {
        throw new BadRequestError('You do not have permission to view versions of this file');
      }

      // Get all versions of the file
      const versions = await prisma.file.findMany({
        where: {
          OR: [
            { id: fileId },
            { parentId: fileId },
          ],
        },
        orderBy: {
          version: 'asc',
        },
      });

      return versions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore a specific version of a file
   */
  async restoreFileVersion(userId: string, fileId: string, versionId: string) {
    try {
      // Find the file and verify ownership
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError('File not found');
      }

      if (file.userId !== userId) {
        throw new BadRequestError('You do not have permission to restore versions of this file');
      }

      // Find the version to restore
      const versionToRestore = await prisma.file.findUnique({
        where: { id: versionId },
      });

      if (!versionToRestore) {
        throw new NotFoundError('Version not found');
      }

      // Verify that the version belongs to the file
      if (versionToRestore.parentId !== fileId && versionToRestore.id !== fileId) {
        throw new BadRequestError('Invalid version for this file');
      }

      // Copy the version data to the current file
      const restoredFile = await prisma.file.update({
        where: { id: fileId },
        data: {
          originalName: versionToRestore.originalName,
          mimeType: versionToRestore.mimeType,
          size: versionToRestore.size,
          key: versionToRestore.key,
          bucket: versionToRestore.bucket,
          url: versionToRestore.url,
          isPublic: versionToRestore.isPublic,
          accessLevel: versionToRestore.accessLevel,
          tags: versionToRestore.tags,
          description: versionToRestore.description,
          version: file.version + 1,
        },
      });

      return restoredFile;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a specific version of a file
   */
  async deleteFileVersion(userId: string, fileId: string, versionId: string) {
    try {
      // Find the file and verify ownership
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundError('File not found');
      }

      if (file.userId !== userId) {
        throw new BadRequestError('You do not have permission to delete versions of this file');
      }

      // Find the version to delete
      const versionToDelete = await prisma.file.findUnique({
        where: { id: versionId },
      });

      if (!versionToDelete) {
        throw new NotFoundError('Version not found');
      }

      // Verify that the version belongs to the file
      if (versionToDelete.parentId !== fileId && versionToDelete.id !== fileId) {
        throw new BadRequestError('Invalid version for this file');
      }

      // Prevent deleting the current version (the main file)
      if (versionToDelete.id === fileId) {
        throw new BadRequestError('Cannot delete the current version of the file');
      }

      // Delete the version from S3
      await s3Service.deleteFile(
        versionToDelete.key,
        versionToDelete.bucket.includes('private') ? 'private' : 'public'
      );

      // Delete the version from the database
      await prisma.file.delete({
        where: { id: versionId },
      });

      return { message: 'Version deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

export const fileVersionService = new FileVersionService();