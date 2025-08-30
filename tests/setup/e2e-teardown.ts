import { Client } from 'pg';

/**
 * E2E Test Teardown
 * This script cleans up the test database for E2E tests
 */

// Test database configuration
const TEST_DB_NAME = 'skooldb_e2e_test';

async function cleanupTestDatabase(): Promise<void> {
  console.log('🧹 Starting E2E test cleanup...');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'user',
    password: 'password',
    database: 'postgres',
  });

  try {
    await client.connect();

    // Terminate active connections to the test database
    console.log('🔄 Terminating active connections to test database...');
    await client.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [TEST_DB_NAME]);

    // Drop the test database
    console.log('🗑️ Dropping test database...');
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    console.log('✅ Test database dropped successfully');
  } catch (error) {
    console.warn('⚠️ Error during cleanup (this may be expected):', error.message);
  } finally {
    await client.end();
  }
}

// Main teardown function
async function globalTeardown(): Promise<void> {
  console.log('🚀 Starting E2E global teardown...');

  try {
    await cleanupTestDatabase();
    console.log('✅ E2E global teardown completed successfully');
  } catch (error) {
    console.error('❌ E2E global teardown failed:', error);
    throw error;
  }
}

export default globalTeardown;

// If this script is run directly, execute the teardown
if (require.main === module) {
  globalTeardown().catch((error) => {
    console.error('❌ Teardown failed:', error);
    process.exit(1);
  });
}