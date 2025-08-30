import { fileVersionService } from '../services/fileVersion.service';
import { prisma } from '../lib/prisma';
import { s3Service } from '../services/s3.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

// Mock the services
jest.mock('../lib/prisma');
jest.mock('../services/s3.service');

describe('FileVersionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFileVersion', () => {
    it('should create a new version of a file', async () => {
      const userId = 'user-123';
      const originalFileId = 'file-123';
      const fileBuffer = Buffer.from('test');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';
      const size = 4;

      const mockOriginalFile = {
        id: 'file-123',
        userId: 'user-123',
        version: 1
      };

      const mockUpload = {
        key: 'files/user-123/timestamp-test.txt',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/files/user-123/timestamp-test.txt'
      };

      const mockNewVersion = {
        id: 'version-456',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 4,
        key: 'files/user-123/timestamp-test.txt',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/files/user-123/timestamp-test.txt',
        isPublic: false,
        accessLevel: 'private',
        tags: [],
        description: null,
        parentId: 'file-123',
        version: 2
      };

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockOriginalFile);
      (s3Service.uploadFile as jest.Mock).mockResolvedValue(mockUpload);
      (prisma.file.create as jest.Mock).mockResolvedValue(mockNewVersion);

      const result = await fileVersionService.createFileVersion(
        userId,
        originalFileId,
        fileBuffer,
        originalName,
        mimeType,
        size
      );

      expect(prisma.file.findUnique).toHaveBeenCalledWith({
        where: { id: originalFileId }
      });
      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: fileBuffer,
          originalname: originalName,
          mimetype: mimeType
        }),
        expect.any(String),
        'private'
      );
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          originalName: 'test.txt',
          mimeType: 'text/plain',
          size: 4,
          key: 'files/user-123/timestamp-test.txt',
          bucket: 'bucket',
          url: 'https://s3.amazonaws.com/bucket/files/user-123/timestamp-test.txt',
          parentId: 'file-123',
          version: 2
        })
      });
      expect(result).toEqual(mockNewVersion);
    });

    it('should throw NotFoundError when original file is not found', async () => {
      const userId = 'user-123';
      const originalFileId = 'non-existent-file';
      const fileBuffer = Buffer.from('test');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';
      const size = 4;

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(fileVersionService.createFileVersion(
        userId,
        originalFileId,
        fileBuffer,
        originalName,
        mimeType,
        size
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError when user does not own the file', async () => {
      const userId = 'user-456';
      const originalFileId = 'file-123';
      const fileBuffer = Buffer.from('test');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';
      const size = 4;

      const mockOriginalFile = {
        id: 'file-123',
        userId: 'user-123',
        version: 1
      };

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockOriginalFile);

      await expect(fileVersionService.createFileVersion(
        userId,
        originalFileId,
        fileBuffer,
        originalName,
        mimeType,
        size
      )).rejects.toThrow(BadRequestError);
    });
  });

  describe('getFileVersions', () => {
    it('should get all versions of a file', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      const mockVersions = [
        { id: 'file-123', version: 1, originalName: 'test.txt' },
        { id: 'version-456', version: 2, originalName: 'test.txt', parentId: 'file-123' }
      ];

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prisma.file.findMany as jest.Mock).mockResolvedValue(mockVersions);

      const result = await fileVersionService.getFileVersions(userId, fileId);

      expect(prisma.file.findUnique).toHaveBeenCalledWith({
        where: { id: fileId }
      });
      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: fileId },
            { parentId: fileId }
          ]
        },
        orderBy: {
          version: 'asc'
        }
      });
      expect(result).toEqual(mockVersions);
    });

    it('should throw NotFoundError when file is not found', async () => {
      const userId = 'user-123';
      const fileId = 'non-existent-file';

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(fileVersionService.getFileVersions(userId, fileId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw BadRequestError when user does not own the file', async () => {
      const userId = 'user-456';
      const fileId = 'file-123';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      await expect(fileVersionService.getFileVersions(userId, fileId))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('restoreFileVersion', () => {
    it('should restore a specific version of a file', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'version-456';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123',
        version: 1
      };

      const mockVersionToRestore = {
        id: 'version-456',
        parentId: 'file-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 4,
        key: 'files/user-123/timestamp-test.txt',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/files/user-123/timestamp-test.txt',
        isPublic: true,
        accessLevel: 'public',
        tags: ['tag1'],
        description: 'Test version'
      };

      const mockRestoredFile = {
        id: 'file-123',
        userId: 'user-123',
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 4,
        key: 'files/user-123/timestamp-test.txt',
        bucket: 'bucket',
        url: 'https://s3.amazonaws.com/bucket/files/user-123/timestamp-test.txt',
        isPublic: true,
        accessLevel: 'public',
        tags: ['tag1'],
        description: 'Test version',
        version: 2
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(mockVersionToRestore);

      (prisma.file.update as jest.Mock).mockResolvedValue(mockRestoredFile);

      const result = await fileVersionService.restoreFileVersion(userId, fileId, versionId);

      expect(prisma.file.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: fileId }
      });
      expect(prisma.file.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: versionId }
      });
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: fileId },
        data: expect.objectContaining({
          originalName: 'test.txt',
          mimeType: 'text/plain',
          size: 4,
          key: 'files/user-123/timestamp-test.txt',
          bucket: 'bucket',
          url: 'https://s3.amazonaws.com/bucket/files/user-123/timestamp-test.txt',
          isPublic: true,
          accessLevel: 'public',
          tags: ['tag1'],
          description: 'Test version',
          version: 2
        })
      });
      expect(result).toEqual(mockRestoredFile);
    });

    it('should throw NotFoundError when file is not found', async () => {
      const userId = 'user-123';
      const fileId = 'non-existent-file';
      const versionId = 'version-456';

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(fileVersionService.restoreFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw BadRequestError when user does not own the file', async () => {
      const userId = 'user-456';
      const fileId = 'file-123';
      const versionId = 'version-456';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      await expect(fileVersionService.restoreFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw NotFoundError when version is not found', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'non-existent-version';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(null);

      await expect(fileVersionService.restoreFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw BadRequestError when version does not belong to the file', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'version-789';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      const mockVersionToRestore = {
        id: 'version-789',
        parentId: 'file-456' // Different parent
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(mockVersionToRestore);

      await expect(fileVersionService.restoreFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('deleteFileVersion', () => {
    it('should delete a specific version of a file', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'version-456';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      const mockVersionToDelete = {
        id: 'version-456',
        parentId: 'file-123',
        key: 'files/user-123/timestamp-test.txt',
        bucket: 'bucket'
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(mockVersionToDelete);

      (s3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.file.delete as jest.Mock).mockResolvedValue({});

      const result = await fileVersionService.deleteFileVersion(userId, fileId, versionId);

      expect(prisma.file.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: fileId }
      });
      expect(prisma.file.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: versionId }
      });
      expect(s3Service.deleteFile).toHaveBeenCalledWith(
        'files/user-123/timestamp-test.txt',
        'bucket'
      );
      expect(prisma.file.delete).toHaveBeenCalledWith({
        where: { id: versionId }
      });
      expect(result).toEqual({ message: 'Version deleted successfully' });
    });

    it('should throw NotFoundError when file is not found', async () => {
      const userId = 'user-123';
      const fileId = 'non-existent-file';
      const versionId = 'version-456';

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(fileVersionService.deleteFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw BadRequestError when user does not own the file', async () => {
      const userId = 'user-456';
      const fileId = 'file-123';
      const versionId = 'version-456';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      (prisma.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      await expect(fileVersionService.deleteFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw NotFoundError when version is not found', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'non-existent-version';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(null);

      await expect(fileVersionService.deleteFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw BadRequestError when version does not belong to the file', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'version-789';

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      const mockVersionToDelete = {
        id: 'version-789',
        parentId: 'file-456' // Different parent
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(mockVersionToDelete);

      await expect(fileVersionService.deleteFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw BadRequestError when trying to delete the current version', async () => {
      const userId = 'user-123';
      const fileId = 'file-123';
      const versionId = 'file-123'; // Same as fileId

      const mockFile = {
        id: 'file-123',
        userId: 'user-123'
      };

      const mockVersionToDelete = {
        id: 'file-123',
        parentId: null // Current version has no parent
      };

      (prisma.file.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFile)
        .mockResolvedValueOnce(mockVersionToDelete);

      await expect(fileVersionService.deleteFileVersion(userId, fileId, versionId))
        .rejects
        .toThrow(BadRequestError);
    });
  });
});