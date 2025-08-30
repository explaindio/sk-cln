import { PrismaClient } from '@prisma/client';

// Create separate client instances to avoid test environment conflicts
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// For production, create a single instance
// For development/testing, create fresh instances to avoid connection issues
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma && process.env.NODE_ENV !== 'test'
    ? global.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  global.prisma = prisma;
}