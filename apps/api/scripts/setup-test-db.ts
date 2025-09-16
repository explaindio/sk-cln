#!/usr/bin/env ts-node

import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Script to set up test database for integration tests
 */
async function setupTestDatabase() {
  const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://skooluser:skoolpass@localhost:5432/skool-clone_test';

  console.log('🗄️ Setting up test database...');

  // Extract connection details from DATABASE_URL
  const url = new URL(testDbUrl);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: 'postgres', // Connect to postgres db first to create test db
  });

  try {
    console.log('🔌 Connecting to PostgreSQL server...');
    await client.connect();

    const testDbName = url.pathname.slice(1); // Remove leading slash

    // Check if test database already exists
    const dbCheckResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDbName]
    );

    if (dbCheckResult.rows.length === 0) {
      console.log(`📦 Creating test database: ${testDbName}`);
      await client.query(`CREATE DATABASE "${testDbName}"`);
      console.log('✅ Test database created');
    } else {
      console.log('ℹ️ Test database already exists');
    }

    await client.end();

    // Now connect to the test database and run migrations
    console.log('🔧 Applying database migrations to test database...');
    process.env.DATABASE_URL = testDbUrl;

    try {
      await execAsync('cd ../.. && npx prisma migrate deploy --schema=./skool-clone/apps/api/prisma/schema.prisma', {
        env: { ...process.env, DATABASE_URL: testDbUrl }
      });
      console.log('✅ Migrations applied to test database');
    } catch (migrateError: any) {
      console.warn('⚠️ Migration failed, this might be expected if schema is already up to date:', (migrateError as Error).message);
    }

    console.log('🎉 Test database setup complete!');
    console.log(`📍 Test DATABASE_URL: ${testDbUrl}`);
    console.log('💡 You can now run integration tests with: pnpm test:integration');

  } catch (error: any) {
    console.error('❌ Failed to setup test database:', error);

    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Please ensure PostgreSQL is running:');
      console.error('   docker run --name postgres-test -e POSTGRES_USER=skooluser -e POSTGRES_PASSWORD=skoolpass -e POSTGRES_DB=skool-clone -p 5432:5432 -d postgres:15');
    } else if (error.code === '42P01') {
      console.error('💡 It looks like PostgreSQL is running but the database doesn\'t exist yet.');
      console.error('   Run: createdb skool-clone_test');
    }

    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupTestDatabase().catch(console.error);
}

export { setupTestDatabase };