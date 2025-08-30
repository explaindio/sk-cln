import { PrismaClient } from '@prisma/client';

export default async (): Promise<void> => {
  console.log('🔧 Setting up integration test environment...');

  // Create a dedicated test database instance
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Store it in the global object for use in tests
  (global as any).testPrisma = prisma;

  try {
    // Test the connection
    await prisma.$connect();
    console.log('✅ Test database connected successfully');

    // Ensure database schema is up to date
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isResetEnabled = process.env.TEST_RESET_DB !== 'false';

    if (isTestEnv && isResetEnabled) {
      console.log('🔄 Resetting test database...');
      try {
        await prisma.$executeRaw`DROP SCHEMA public CASCADE;`;
        await prisma.$executeRaw`CREATE SCHEMA public;`;
        await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO postgres;`;
        await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO public;`;
        console.log('✅ Test database reset complete');
      } catch (dbResetError) {
        console.warn('⚠️ Database reset failed, continuing without reset:', dbResetError.message);
      }
    }
  } catch (error) {
    if (error.code === 'P1001') {
      console.error('❌ Database server not reachable. Please ensure PostgreSQL is running.');
      console.error('💡 For development, you can run:');
      console.error('   docker run --name postgres-test -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=test -p 5432:5432 -d postgres:15');
    } else if (error.code === 'P1000') {
      console.error('❌ Database authentication failed. Please check your DATABASE_URL credentials.');
      console.error('💡 Current DATABASE_URL:', process.env.DATABASE_URL);
    } else {
      console.error('❌ Database setup failed:', error);
    }
    throw error;
  }
};