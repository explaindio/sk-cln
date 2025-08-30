import { prisma } from '../lib/prisma';

export class StorageAnalyticsService {
  async getUserStorageUsage(userId: string) {
    const files = await prisma.file.findMany({
      where: { userId },
      select: { size: true, mimeType: true },
    });

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    const byType = files.reduce((acc, file) => {
      const type = file.mimeType.split('/')[0];
      acc[type] = (acc[type] || 0) + file.size;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSize,
      totalFiles: files.length,
      byType,
      limit: 5 * 1024 * 1024 * 1024, // 5GB limit
      percentUsed: (totalSize / (5 * 1024 * 1024 * 1024)) * 100,
    };
  }

  async getCommunityStorageUsage(communityId: string) {
    // Implementation for community storage tracking
  }
}