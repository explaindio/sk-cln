import { NextResponse } from 'next/server';
import { getDeploymentConfig } from '@/config/deployment.config';
import { db } from '@/lib/db'; // Assume Prisma or DB client from lib

// Readiness probe - checks if the app is ready to serve traffic
// Includes DB connection, external services, etc.
export async function GET() {
  try {
    const config = getDeploymentConfig();
    if (config.environmentVariables.NODE_ENV !== 'production') {
      return NextResponse.json({ status: 'ready', timestamp: new Date().toISOString() });
    }

    // Check database connection
    try {
      await db.$connect();
      await db.$queryRaw`SELECT 1`; // Simple query to verify
      await db.$disconnect();
    } catch (dbError) {
      console.error('DB readiness check failed:', dbError);
      return NextResponse.json({ status: 'not ready', message: 'Database connection failed' }, { status: 500 });
    }

    // Check external services (e.g., Stripe, Redis)
    if (process.env.STRIPE_SECRET_KEY) {
      // Placeholder for Stripe check
      // const stripe = await import('stripe')(process.env.STRIPE_SECRET_KEY);
      // await stripe.accounts.list({ limit: 1 });
    }

    if (process.env.REDIS_URL) {
      // Placeholder for Redis check
      // const redis = await import('redis');
      // const client = redis.createClient({ url: process.env.REDIS_URL });
      // await client.connect();
      // await client.ping();
      // await client.quit();
    }

    // Check API URL if separate
    if (process.env.API_URL) {
      const response = await fetch(`${process.env.API_URL}/health`, { timeout: 5000 });
      if (!response.ok) {
        return NextResponse.json({ status: 'not ready', message: 'Backend API not ready' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      status: 'ready', 
      timestamp: new Date().toISOString(),
      checks: ['db', 'external_services']
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    return NextResponse.json({ status: 'not ready', message: 'Readiness check failed' }, { status: 500 });
  }
}