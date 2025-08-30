import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Note: Test database setup is now handled by global setup and teardown files
// This file is kept for backward compatibility and test-specific setup

// Clean up hooks - Note: Database connection is now handled by global setup/teardown
beforeAll(async () => {
  // Run database migrations/schema setup before tests
  const prisma = (global as any).testPrisma;
  if (prisma) {
    // Clean up any leftover test data from previous runs
    await cleanupDatabase();
  }
});

afterAll(async () => {
  // Clean up database after all tests
  await cleanupDatabase();

  // Note: Database disconnection is handled by global teardown
});

beforeEach(async () => {
  // Clean up before each test
  await cleanupDatabase();
});

afterEach(async () => {
  // Additional cleanup if needed
});

// Utility function to access the test database
export const getTestPrisma = () => {
  const prisma = (global as any).testPrisma;
  if (!prisma) {
    throw new Error('Test Prisma client not initialized. Global setup may have failed.');
  }
  return prisma;
};

// Cleanup function for test data
export const cleanupDatabase = async (): Promise<void> => {
  const prisma = (global as any).testPrisma;
  if (!prisma) return;

  // Clean up in order to avoid foreign key constraints
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.post.deleteMany();
  await prisma.eventAttendee.deleteMany();
  await prisma.event.deleteMany();
  await prisma.communityMember.deleteMany();
  await prisma.category.deleteMany();
  await prisma.community.deleteMany();
  await prisma.user.deleteMany();
};