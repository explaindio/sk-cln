import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { s3Service } from '../services/s3.service';
import { imageService } from '../services/image.service';
import { prisma } from '../lib/prisma';
import { BadRequestError } from '../utils/errors';
import { bulkDeleteFiles, permanentlyDeleteFiles } from '../jobs/storage-cleanup.job';

export const uploadController = {
  async getPresignedUrl(req: AuthRequest, res: Response) {
    const { fileName, fileType, uploadType } = req.body;

    if (!fileName || !fileType) {
      throw new BadRequestError('File name and type are required');
    }

    const key = `uploads/${req.user!.id}/${Date.now()}-${fileName}`;
    const bucket = uploadType === 'private' ? 'private' : 'public';

    const presignedData = await s3Service.getPresignedUploadUrl(
      key,
      fileType,
      bucket
    );

    res.json(presignedData);
  },

  async uploadImage(req: AuthRequest, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No image file provided');
    }

    const basePath = `images/${req.user!.id}`;
    const results = await imageService.processAndUploadImage(
      req.file,
      basePath,
      true
    );

    // Store file reference in database
    const file = await prisma.file.create({
      data: {
        userId: req.user!.id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        key: results[0].key,
        bucket: results[0].bucket,
        url: results[0].url,
        variants: JSON.stringify(results),
      },
    });

    res.json({
      file,
      variants: results,
    });
  },

  async uploadImages(req: AuthRequest, res: Response) {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new BadRequestError('No image files provided');
    }

    const uploadPromises = files.map(file =>
      imageService.processAndUploadImage(
        file,
        `images/${req.user!.id}`,
        true
      )
    );

    const results = await Promise.all(uploadPromises);

    res.json({ uploads: results });
  },

  async uploadFile(req: AuthRequest, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No file provided');
    }

    const { isPublic, accessLevel, tags, description } = req.body;
    const key = `files/${req.user!.id}/${Date.now()}-${req.file.originalname}`;
    const upload = await s3Service.uploadFile(req.file, key, isPublic ? 'public' : 'private');

    const file = await prisma.file.create({
      data: {
        userId: req.user!.id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        key: upload.key,
        bucket: upload.bucket,
        url: upload.url,
        isPublic: isPublic || false,
        accessLevel: accessLevel || 'private',
        tags: tags || [],
        description: description || null,
      },
    });

    res.json(file);
  },

  async uploadAvatar(req: AuthRequest, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No avatar image provided');
    }

    const basePath = `avatars/${req.user!.id}`;
    const results = await imageService.processAndUploadImage(
      req.file,
      basePath,
      true
    );

    // Update user avatar
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        avatarUrl: results.find(r => r.type === 'medium')?.url || results[0].url,
      },
    });

    res.json({
      avatar: results,
    });
  },

  async getFiles(req: AuthRequest, res: Response) {
    const files = await prisma.file.findMany({
      where: {
        userId: req.user!.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(files);
  },

  async deleteFile(req: AuthRequest, res: Response) {
    const { key } = req.params;

    // Verify ownership
    const file = await prisma.file.findFirst({
      where: {
        key,
        userId: req.user!.id,
      },
    });

    if (!file) {
      throw new BadRequestError('File not found');
    }

    // Use soft delete approach
    await prisma.file.update({
      where: { id: file.id },
      data: {
        deletedAt: new Date(),
        description: file.description ? `${file.description} [DELETED]` : '[DELETED]'
      },
    });

    res.json({ message: 'File deleted successfully' });
  },

  async bulkDeleteFiles(req: AuthRequest, res: Response) {
    const { fileIds } = req.body;
    const userId = req.user!.id;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      throw new BadRequestError('File IDs are required');
    }

    try {
      const deletedFiles = await bulkDeleteFiles(fileIds, userId);
      res.json({
        message: `Successfully deleted ${deletedFiles.length} files`,
        deletedFiles
      });
    } catch (error) {
      throw new BadRequestError('Failed to delete files');
    }
  },

  async permanentlyDeleteFiles(req: AuthRequest, res: Response) {
    const { fileIds } = req.body;
    const userId = req.user!.id;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      throw new BadRequestError('File IDs are required');
    }

    try {
      const deletedFiles = await permanentlyDeleteFiles(fileIds, userId);
      res.json({
        message: `Successfully permanently deleted ${deletedFiles.length} files`,
        deletedFiles
      });
    } catch (error) {
      throw new BadRequestError('Failed to permanently delete files');
    }
  },
};