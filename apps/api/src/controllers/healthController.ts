import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'unknown',
    memory: process.memoryUsage(),
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
  }

  const isHealthy = checks.database === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    checks,
  });
};