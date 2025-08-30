import { 
  storageCleanupJob, 
  bulkDeleteFiles, 
  permanentlyDeleteFiles 
} from '../jobs/storage-cleanup.job';
import { prisma } from '../lib/prisma';
import { s3Service } from '../services/s3.service';

// Mock the services
jest.mock('../lib/prisma');
jest.mock('../services/s3.service');

describe('StorageCleanupJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  describe('storageCleanupJob', () => {
    it('should clean up temporary uploads older than 7 days', async () => {
      const mockTempUploads = [
        { id: 'temp-1', key: 'temp/file1.txt', bucket: 'public', originalName: 'file1.txt' },
        { id: 'temp-2', key: 'temp/file2.txt', bucket: 'private', originalName: 'file2.txt' }
      ];

      const mockOldFiles = [
        { id: 'old-1', key: 'files/file3.txt', bucket: 'public', originalName: 'file3.txt' }
      ];

      const mockSoftDeletedFiles = [
        { id: 'deleted-1', key: 'files/file4.txt', bucket: 'private', originalName: 'file4.txt' }
      ];

      (prisma.file.findMany as jest.Mock)
        .mockResolvedValueOnce(mockTempUploads) // temp uploads
        .mockResolvedValueOnce(mockSoftDeletedFiles) // soft deleted files
        .mockResolvedValueOnce(mockOldFiles); // old files

      (s3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.file.update as jest.Mock).mockResolvedValue({});
      (prisma.file.delete as jest.Mock).mockResolvedValue({});

      await storageCleanupJob();

      // Check temp uploads cleanup
      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: {
          key: { startsWith: 'temp/' },
          createdAt: { lt: expect.any(Date) },
          deletedAt: null
        }
      });

      expect(prisma.file.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'temp-1' },
        data: {
          deletedAt: expect.any(Date),
          description: '[DELETED]'
        }
      });

      expect(prisma.file.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'temp-2' },
        data: {
          deletedAt: expect.any(Date),
          description: '[DELETED]'
        }
      });

      // Check soft deleted files cleanup
      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: { lt: expect.any(Date) }
        }
      });

      expect(s3Service.deleteFile).toHaveBeenNthCalledWith(1, 'files/file4.txt', 'private');
      expect(prisma.file.delete).toHaveBeenNthCalledWith(1, { where: { id: 'deleted-1' } });

      // Check old files cleanup
      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          deletedAt: null
        }
      });

      expect(prisma.file.update).toHaveBeenNthCalledWith(3, {
        where: { id: 'old-1' },
        data: {
          deletedAt: expect.any(Date),
          description: '[OLD DELETED]'
        }
      });
    });

    it('should handle errors during cleanup gracefully', async () => {
      (prisma.file.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await storageCleanupJob();

      expect(console.error).toHaveBeenCalledWith('Storage cleanup job failed:', expect.any(Error));
    });
  });

  describe('bulkDeleteFiles', () => {
    it('should soft delete multiple files', async () => {
      const fileIds = ['file-1', 'file-2'];
      const userId = 'user-123';

      const mockFiles = [
        { id: 'file-1', originalName: 'file1.txt' },
        { id: 'file-2', originalName: 'file2.txt' }
      ];

      (prisma.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
      (prisma.file.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await bulkDeleteFiles(fileIds, userId);

      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: fileIds },
          userId,
          deletedAt: null
        }
      });

      expect(prisma.file.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: fileIds },
          userId,
          deletedAt: null
        },
        data: {
          deletedAt: expect.any(Date),
          description: { set: '[BULK DELETED]' }
        }
      });

      expect(result).toEqual(mockFiles);
    });

    it('should handle errors during bulk delete', async () => {
      const fileIds = ['file-1', 'file-2'];
      const userId = 'user-123';

      (prisma.file.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(bulkDeleteFiles(fileIds, userId))
        .rejects
        .toThrow('Database error');

      expect(console.error).toHaveBeenCalledWith('Bulk delete failed:', expect.any(Error));
    });
  });

  describe('permanentlyDeleteFiles', () => {
    it('should permanently delete multiple files', async () => {
      const fileIds = ['file-1', 'file-2'];
      const userId = 'user-123';

      const mockFiles = [
        { id: 'file-1', key: 'files/file1.txt', bucket: 'public', originalName: 'file1.txt' },
        { id: 'file-2', key: 'files/file2.txt', bucket: 'private', originalName: 'file2.txt' }
      ];

      (prisma.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
      (s3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.file.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await permanentlyDeleteFiles(fileIds, userId);

      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: fileIds },
          userId
        }
      });

      expect(s3Service.deleteFile).toHaveBeenNthCalledWith(1, 'files/file1.txt', 'public');
      expect(s3Service.deleteFile).toHaveBeenNthCalledWith(2, 'files/file2.txt', 'private');

      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: fileIds },
          userId
        }
      });

      expect(result).toEqual(mockFiles);
    });

    it('should handle S3 deletion errors and continue with database deletion', async () => {
      const fileIds = ['file-1'];
      const userId = 'user-123';

      const mockFiles = [
        { id: 'file-1', key: 'files/file1.txt', bucket: 'public', originalName: 'file1.txt' }
      ];

      (prisma.file.findMany as jest.Mock).mockResolvedValue(mockFiles);
      (s3Service.deleteFile as jest.Mock).mockRejectedValue(new Error('S3 error'));
      (prisma.file.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await permanentlyDeleteFiles(fileIds, userId);

      expect(s3Service.deleteFile).toHaveBeenCalledWith('files/file1.txt', 'public');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete file files/file1.txt from S3:', 
        expect.any(Error)
      );
      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: fileIds },
          userId
        }
      });

      expect(result).toEqual(mockFiles);
    });

    it('should handle errors during permanent delete', async () => {
      const fileIds = ['file-1'];
      const userId = 'user-123';

      (prisma.file.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(permanentlyDeleteFiles(fileIds, userId))
        .rejects
        .toThrow('Database error');

      expect(console.error).toHaveBeenCalledWith('Permanent delete failed:', expect.any(Error));
    });
  });
});