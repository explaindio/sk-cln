import { PrismaClient } from '@prisma/client';

export default async (): Promise<void> => {
  console.log('🧹 Tearing down integration test environment...');

  const prisma = (global as any).testPrisma as PrismaClient;

  if (prisma) {
    try {
      await prisma.$disconnect();
      console.log('✅ Test database disconnected successfully');
    } catch (error) {
      console.warn('⚠️ Error disconnecting test database:', error);
    } finally {
      // Clean up the global reference
      (global as any).testPrisma = undefined;
    }
  } else {
    console.log('⚠️ No test prisma instance found to disconnect');
  }
};