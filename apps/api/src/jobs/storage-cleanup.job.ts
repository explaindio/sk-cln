import { prisma } from '../lib/prisma';
import { s3Service } from '../services/s3.service';

export async function storageCleanupJob() {
  console.log('Starting storage cleanup job...');

  try {
    // Clean up old temporary uploads (older than 7 days)
    const tempUploads = await prisma.file.findMany({
      where: {
        key: {
          startsWith: 'temp/',
        },
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 1000), // Older than 7 days
        },
        deletedAt: null, // Not already soft deleted
      },
    });

    console.log(`Found ${tempUploads.length} old temporary files`);

    // Soft delete from database first
    for (const temp of tempUploads) {
      try {
        await prisma.file.update({
          where: { id: temp.id },
          data: { 
            deletedAt: new Date(),
            // Mark as deleted in metadata
            description: temp.description ? `${temp.description} [DELETED]` : '[DELETED]'
          },
        });

        console.log(`Soft deleted temporary file: ${temp.originalName}`);
      } catch (error) {
        console.error(`Failed to soft delete file ${temp.id}:`, error);
      }
    }

    // Hard delete files that were soft deleted more than 30 days ago
    const softDeletedFiles = await prisma.file.findMany({
      where: {
        deletedAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 1000), // Deleted more than 30 days ago
        },
      },
    });

    console.log(`Found ${softDeletedFiles.length} files ready for hard deletion`);

    // Delete from S3 and database
    for (const file of softDeletedFiles) {
      try {
        await s3Service.deleteFile(
          file.key,
          file.bucket.includes('private') ? 'private' : 'public'
        );

        await prisma.file.delete({
          where: { id: file.id },
        });

        console.log(`Hard deleted file: ${file.originalName}`);
      } catch (error) {
        console.error(`Failed to hard delete file ${file.id}:`, error);
      }
    }

    // Clean up very old files (older than 60 days) regardless of type
    const oldFiles = await prisma.file.findMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Older than 60 days
        },
        deletedAt: null, // Not already soft deleted
      },
    });

    console.log(`Found ${oldFiles.length} very old files`);

    // Soft delete these old files
    for (const file of oldFiles) {
      try {
        await prisma.file.update({
          where: { id: file.id },
          data: { 
            deletedAt: new Date(),
            description: file.description ? `${file.description} [OLD DELETED]` : '[OLD DELETED]'
          },
        });

        console.log(`Soft deleted old file: ${file.originalName}`);
      } catch (error) {
        console.error(`Failed to soft delete old file ${file.id}:`, error);
      }
    }

    console.log('Storage cleanup job completed');
  } catch (error) {
    console.error('Storage cleanup job failed:', error);
  }
}

/**
 * Bulk delete files
 */
export async function bulkDeleteFiles(fileIds: string[], userId: string) {
  try {
    console.log(`Bulk deleting ${fileIds.length} files for user ${userId}`);

    // Verify ownership and get files
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: userId,
        deletedAt: null, // Not already deleted
      },
    });

    // Soft delete files in database
    const softDeletedFiles = await prisma.file.updateMany({
      where: {
        id: { in: fileIds },
        userId: userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        description: { set: '[BULK DELETED]' },
      },
    });

    console.log(`Soft deleted ${softDeletedFiles.count} files`);

    // Return the soft deleted files
    return files;
  } catch (error) {
    console.error('Bulk delete failed:', error);
    throw error;
  }
}

/**
 * Permanently delete files (hard delete)
 */
export async function permanentlyDeleteFiles(fileIds: string[], userId: string) {
  try {
    console.log(`Permanently deleting ${fileIds.length} files for user ${userId}`);

    // Verify ownership and get files
    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        userId: userId,
      },
    });

    // Delete from S3
    for (const file of files) {
      try {
        await s3Service.deleteFile(
          file.key,
          file.bucket.includes('private') ? 'private' : 'public'
        );
      } catch (error) {
        console.error(`Failed to delete file ${file.key} from S3:`, error);
      }
    }

    // Delete from database
    const deletedFiles = await prisma.file.deleteMany({
      where: {
        id: { in: fileIds },
        userId: userId,
      },
    });

    console.log(`Permanently deleted ${deletedFiles.count} files`);

    return files;
  } catch (error) {
    console.error('Permanent delete failed:', error);
    throw error;
  }
}

// Schedule to run daily
export function scheduleStorageCleanup() {
  // Run immediately on startup
  storageCleanupJob();

  // Then run every 24 hours
  setInterval(() => {
    storageCleanupJob();
  }, 24 * 60 * 60 * 1000);
}