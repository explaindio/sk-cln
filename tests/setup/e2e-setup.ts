import { Client } from 'pg';
import { execSync } from 'child_process';
import path from 'path';

/**
 * E2E Test Setup
 * This script creates and initializes the test database for E2E tests
 */

// Test database configuration
const TEST_DB_NAME = 'skooldb_e2e_test';

// Create connection to postgres database (not the test database)
async function createTestDatabase(): Promise<Client> {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'user',
    password: 'password',
    database: 'postgres', // Connect to postgres to create/drop the test database
  });

  await client.connect();

  try {
    // Terminate active connections to the test database
    await client.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [TEST_DB_NAME]);

    // Drop and recreate the test database
    try {
      await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
      console.log('✅ Dropped existing test database');
    } catch (dropError) {
      console.warn('⚠️ Could not drop database, continuing:', dropError.message);
    }

    await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`✅ Created test database: ${TEST_DB_NAME}`);
  } catch (error) {
    console.error('❌ Error creating test database:', error);
    throw error;
  } finally {
    await client.end();
  }

  return client;
}

async function setupTestDatabase(): Promise<void> {
  console.log('🔧 Setting up E2E test database...');

  const client = await createTestDatabase();

  try {
    console.log('🔄 Running database migrations...');
    // Run Prisma migrations using the test database
    const testDatabaseUrl = `postgresql://user:password@localhost:5432/${TEST_DB_NAME}`;

    execSync('cd ../apps/api && npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });
    console.log('✅ Database migrations completed successfully');

  } catch (migrateError) {
    console.error('❌ Error running migrations:', migrateError);
    throw migrateError;
  }
}

// Main setup function
async function globalSetup(): Promise<void> {
  console.log('🚀 Starting E2E global setup...');

  try {
    await setupTestDatabase();
    console.log('✅ E2E global setup completed successfully');
  } catch (error) {
    console.error('❌ E2E global setup failed:', error);
    throw error;
  }
}

export default globalSetup;

// If this script is run directly, execute the setup
if (require.main === module) {
  globalSetup().catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}