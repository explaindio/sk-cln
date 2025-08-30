import { uploadController } from '../controllers/upload.controller';
import { s3Service } from '../services/s3.service';
import { imageService } from '../services/image.service';
import { prisma } from '../lib/prisma';
import { BadRequestError } from '../utils/errors';

// Mock the services
jest.mock('../services/s3.service');
jest.mock('../services/image.service');
jest.mock('../lib/prisma');

describe('UploadController', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser } as any;
  const mockResponse = { json: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPresignedUrl', () => {
    it('should generate a presigned URL for file upload', async () => {
      const mockReq = {
        ...mockRequest,
        body: {
          fileName: 'test.txt',
          fileType: 'text/plain',
          uploadType: 'private'
        }
      };

      const mockPresignedData = {
        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
        key: 'key',
        bucket: 'bucket'
      };

      (s3Service.getPresignedUploadUrl as jest.Mock).mockResolvedValue(mockPresignedData);

      await uploadController.getPresignedUrl(mockReq, mockResponse);

      expect(s3Service.getPresignedUploadUrl).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockPresignedData);
    });

    it('should throw BadRequestError when fileName is missing', async () => {
      const mockReq = {
        ...mockRequest,
        body: {
          fileType: 'text/plain'
        }
      };

      await expect(uploadController.getPresignedUrl(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw BadRequestError when fileType is missing', async () => {
      const mockReq = {
        ...mockRequest,
        body: {
          fileName: 'test.txt'
        }
      };

      await expect(uploadController.getPresignedUrl(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('uploadFile', () => {
    it('should upload a file and save metadata to database', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 4
      };

      const mockReq = {
        ...mockRequest,
        file: mockFile,
        body: {
          isPublic: true,
          accessLevel: 'public',
          tags: ['tag1', 'tag2'],
          description: 'Test file'
        }
      };

      const mockUpload = {
        key: 'key',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/key'
      };

      const mockFileRecord = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 4,
        key: 'key',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/key',
        isPublic: true,
        accessLevel: 'public',
        tags: ['tag1', 'tag2'],
        description: 'Test file'
      };

      (s3Service.uploadFile as jest.Mock).mockResolvedValue(mockUpload);
      (prisma.file.create as jest.Mock).mockResolvedValue(mockFileRecord);

      await uploadController.uploadFile(mockReq, mockResponse);

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        expect.any(String),
        'public'
      );
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          originalName: 'test.txt',
          mimeType: 'text/plain',
          size: 4,
          key: 'key',
          bucket: 'bucket',
          url: 'https://s3.amazonaws.com/bucket/key',
          isPublic: true,
          accessLevel: 'public',
          tags: ['tag1', 'tag2'],
          description: 'Test file'
        })
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockFileRecord);
    });

    it('should throw BadRequestError when no file is provided', async () => {
      const mockReq = {
        ...mockRequest,
        file: null
      };

      await expect(uploadController.uploadFile(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('uploadImage', () => {
    it('should process and upload an image with variants', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 4
      };

      const mockReq = {
        ...mockRequest,
        file: mockFile
      };

      const mockResults = [
        {
          type: 'original',
          key: 'images/user-123/original.jpg',
          bucket: 'bucket',
          url: 'https://s3.amazonaws.com/bucket/images/user-123/original.jpg'
        },
        {
          type: 'thumb',
          key: 'images/user-123/thumb.webp',
          bucket: 'bucket',
          url: 'https://s3.amazonaws.com/bucket/images/user-123/thumb.webp'
        }
      ];

      const mockFileRecord = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 4,
        key: 'images/user-123/original.jpg',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/images/user-123/original.jpg',
        variants: JSON.stringify(mockResults)
      };

      (imageService.processAndUploadImage as jest.Mock).mockResolvedValue(mockResults);
      (prisma.file.create as jest.Mock).mockResolvedValue(mockFileRecord);

      await uploadController.uploadImage(mockReq, mockResponse);

      expect(imageService.processAndUploadImage).toHaveBeenCalledWith(
        mockFile,
        'images/user-123',
        true
      );
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 4,
          key: 'images/user-123/original.jpg',
          bucket: 'bucket',
          url: 'https://s3.amazonaws.com/bucket/images/user-123/original.jpg',
          variants: JSON.stringify(mockResults)
        })
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        file: mockFileRecord,
        variants: mockResults
      });
    });

    it('should throw BadRequestError when no image file is provided', async () => {
      const mockReq = {
        ...mockRequest,
        file: null
      };

      await expect(uploadController.uploadImage(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('deleteFile', () => {
    it('should soft delete a file', async () => {
      const mockReq = {
        ...mockRequest,
        params: { key: 'file-key' }
      };

      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        key: 'file-key',
        bucket: 'bucket',
        description: 'Test file'
      };

      (prisma.file.findFirst as jest.Mock).mockResolvedValue(mockFile);
      (prisma.file.update as jest.Mock).mockResolvedValue({
        ...mockFile,
        deletedAt: new Date(),
        description: 'Test file [DELETED]'
      });

      await uploadController.deleteFile(mockReq, mockResponse);

      expect(prisma.file.findFirst).toHaveBeenCalledWith({
        where: {
          key: 'file-key',
          userId: 'user-123'
        }
      });
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        data: {
          deletedAt: expect.any(Date),
          description: 'Test file [DELETED]'
        }
      });
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'File deleted successfully' });
    });

    it('should throw BadRequestError when file is not found', async () => {
      const mockReq = {
        ...mockRequest,
        params: { key: 'non-existent-key' }
      };

      (prisma.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(uploadController.deleteFile(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('bulkDeleteFiles', () => {
    it('should bulk delete files', async () => {
      const mockReq = {
        ...mockRequest,
        body: { fileIds: ['file-1', 'file-2'] }
      };

      const mockDeletedFiles = [
        { id: 'file-1', originalName: 'file1.txt' },
        { id: 'file-2', originalName: 'file2.txt' }
      ];

      // Mock the bulkDeleteFiles function from storage-cleanup.job
      const { bulkDeleteFiles } = require('../jobs/storage-cleanup.job');
      jest.mock('../jobs/storage-cleanup.job');
      (bulkDeleteFiles as jest.Mock).mockResolvedValue(mockDeletedFiles);

      await uploadController.bulkDeleteFiles(mockReq, mockResponse);

      expect(bulkDeleteFiles).toHaveBeenCalledWith(['file-1', 'file-2'], 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Successfully deleted 2 files',
        deletedFiles: mockDeletedFiles
      });
    });

    it('should throw BadRequestError when fileIds are missing', async () => {
      const mockReq = {
        ...mockRequest,
        body: {}
      };

      await expect(uploadController.bulkDeleteFiles(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });
});