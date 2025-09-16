import { NextResponse } from 'next/server';
import { getDeploymentConfig } from '@/config/deployment.config';

// Liveness probe - checks if the container is running
// Should return 200 if the app is alive, 500 if not
export async function GET() {
  try {
    // Basic app health check
    const config = getDeploymentConfig();
    if (config.environmentVariables.NODE_ENV !== 'production') {
      return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Check if required services are accessible (minimal for liveness)
    // For example, check if Redis is connected if used
    if (process.env.REDIS_URL) {
      // Import and check Redis connection
      // const redis = await import('redis'); // Placeholder - implement actual check
      // const client = redis.createClient({ url: process.env.REDIS_URL });
      // await client.connect();
      // await client.ping();
      // await client.quit();
      // Or just return ok for simple liveness
    }

    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Liveness check failed:', error);
    return NextResponse.json({ status: 'error', message: 'Liveness check failed' }, { status: 500 });
  }
}