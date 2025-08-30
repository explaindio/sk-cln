import { User } from '@prisma/client';
import { generateAccessToken } from '../../utils/jwt';
import bcrypt from 'bcrypt';

// Use the global test prisma instance
const getTestPrisma = () => {
  const prisma = (global as any).testPrisma;
  if (!prisma) {
    throw new Error('Test Prisma client not initialized. Global setup may have failed.');
  }
  return prisma;
};

const prisma = getTestPrisma();

export interface TestUser extends User {
  password: string;
}

export const createTestUser = async (overrides: Partial<User> = {}): Promise<TestUser> => {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    passwordHash: await bcrypt.hash('testpassword123', 10),
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    isActive: true,
    ...overrides
  };

  const user = await prisma.user.create({
    data: defaultUser
  });

  return { ...user, password: 'testpassword123' };
};

export const generateToken = (userId: string, email?: string): string => {
  return generateAccessToken({
    userId,
    email: email || `test-${userId}@example.com`
  });
};

// Cleanup function is now handled by setup.ts
export const cleanupDatabase = async (): Promise<void> => {
  // This function is kept for backward compatibility
  // Actual cleanup is handled by the setup file
};

export { prisma };