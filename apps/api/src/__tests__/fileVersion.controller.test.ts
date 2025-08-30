import { fileVersionController } from '../controllers/fileVersionController';
import { fileVersionService } from '../services/fileVersion.service';
import { BadRequestError } from '../utils/errors';

// Mock the services
jest.mock('../services/fileVersion.service');
jest.mock('../middleware/upload.middleware');

describe('FileVersionController', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser } as any;
  const mockResponse = { json: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFileVersions', () => {
    it('should get all versions of a file', async () => {
      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123' }
      };

      const mockVersions = [
        { id: 'file-123', version: 1, originalName: 'test.txt' },
        { id: 'version-456', version: 2, originalName: 'test.txt' }
      ];

      (fileVersionService.getFileVersions as jest.Mock).mockResolvedValue(mockVersions);

      await fileVersionController.getFileVersions(mockReq, mockResponse);

      expect(fileVersionService.getFileVersions).toHaveBeenCalledWith('user-123', 'file-123');
      expect(mockResponse.json).toHaveBeenCalledWith(mockVersions);
    });

    it('should throw BadRequestError when fileId is missing', async () => {
      const mockReq = {
        ...mockRequest,
        params: {}
      };

      await expect(fileVersionController.getFileVersions(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('createFileVersion', () => {
    it('should create a new version of a file', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 4
      };

      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123' },
        file: mockFile,
        body: {
          isPublic: true,
          accessLevel: 'public',
          tags: ['tag1', 'tag2'],
          description: 'Test file version'
        }
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
        isPublic: true,
        accessLevel: 'public',
        tags: ['tag1', 'tag2'],
        description: 'Test file version',
        parentId: 'file-123',
        version: 2
      };

      (fileVersionService.createFileVersion as jest.Mock).mockResolvedValue(mockNewVersion);

      await fileVersionController.createFileVersion(mockReq, mockResponse);

      expect(fileVersionService.createFileVersion).toHaveBeenCalledWith(
        'user-123',
        'file-123',
        mockFile.buffer,
        'test.txt',
        'text/plain',
        4,
        true,
        'public',
        ['tag1', 'tag2'],
        'Test file version'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockNewVersion);
    });

    it('should throw BadRequestError when fileId is missing', async () => {
      const mockReq = {
        ...mockRequest,
        params: {},
        file: {
          buffer: Buffer.from('test'),
          originalname: 'test.txt',
          mimetype: 'text/plain',
          size: 4
        }
      };

      await expect(fileVersionController.createFileVersion(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });

    it('should throw BadRequestError when no file is provided', async () => {
      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123' },
        file: null
      };

      await expect(fileVersionController.createFileVersion(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('restoreFileVersion', () => {
    it('should restore a specific version of a file', async () => {
      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123', versionId: 'version-456' }
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
        tags: ['tag1', 'tag2'],
        description: 'Test file version',
        version: 3
      };

      (fileVersionService.restoreFileVersion as jest.Mock).mockResolvedValue(mockRestoredFile);

      await fileVersionController.restoreFileVersion(mockReq, mockResponse);

      expect(fileVersionService.restoreFileVersion).toHaveBeenCalledWith(
        'user-123',
        'file-123',
        'version-456'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockRestoredFile);
    });

    it('should throw BadRequestError when fileId or versionId is missing', async () => {
      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123' }
      };

      await expect(fileVersionController.restoreFileVersion(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });

  describe('deleteFileVersion', () => {
    it('should delete a specific version of a file', async () => {
      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123', versionId: 'version-456' }
      };

      const mockResult = { message: 'Version deleted successfully' };

      (fileVersionService.deleteFileVersion as jest.Mock).mockResolvedValue(mockResult);

      await fileVersionController.deleteFileVersion(mockReq, mockResponse);

      expect(fileVersionService.deleteFileVersion).toHaveBeenCalledWith(
        'user-123',
        'file-123',
        'version-456'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should throw BadRequestError when fileId or versionId is missing', async () => {
      const mockReq = {
        ...mockRequest,
        params: { fileId: 'file-123' }
      };

      await expect(fileVersionController.deleteFileVersion(mockReq, mockResponse))
        .rejects
        .toThrow(BadRequestError);
    });
  });
});