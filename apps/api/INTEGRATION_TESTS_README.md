# Integration Tests Setup and Usage

This guide explains how to set up and run integration tests for the Skool Clone API.

## Prerequisites

1. **PostgreSQL Database**: You need access to a PostgreSQL database for running integration tests.
2. **Node.js and pnpm**: Ensure you have Node.js 18+ and pnpm installed.

## Quick Setup

### Option 1: Using Docker (Recommended)

Start a PostgreSQL container for testing:

```bash
docker run --name postgres-test \
  -e POSTGRES_USER=skooluser \
  -e POSTGRES_PASSWORD=skoolpass \
  -e POSTGRES_DB=skool-clone \
  -p 5432:5432 \
  -d postgres:15
```

### Option 2: Using Local PostgreSQL

If you have PostgreSQL installed locally, create a test database:

```bash
createdb skool-clone_test
```

## Test Database Setup

1. **Automatic Setup**: Run the setup script to create and migrate the test database:

```bash
cd apps/api
pnpm test:setup-db
```

This script will:
- Create the test database if it doesn't exist
- Apply all database migrations
- Configure the database for testing

2. **Manual Setup**: If you prefer to set it up manually:

```bash
# Set the test database URL
export DATABASE_URL="postgresql://skooluser:skoolpass@localhost:5432/skool-clone_test"

# Run migrations
cd apps/api
npx prisma migrate deploy
```

## Running Integration Tests

Once the database is set up, run the integration tests:

```bash
# From the API directory
cd apps/api
pnpm test:integration

# Or from the project root
pnpm test:integration
```

### Test Environment Variables

The tests use the following environment variables from `.env.test`:

```env
# Database Configuration
DATABASE_URL=postgresql://skooluser:skoolpass@localhost:5432/skool-clone_test

# JWT Configuration
JWT_ACCESS_SECRET=test-jwt-access-secret-for-testing-only
JWT_REFRESH_SECRET=test-jwt-refresh-secret-for-testing-only

# Application Configuration
NODE_ENV=test
PORT=4001

# Disable database reset (optional)
TEST_RESET_DB=false
```

## Test Structure

### Integration Tests Location
- `src/__tests__/integration/*.test.ts` - Integration test files
- `src/__tests__/helpers/` - Test utilities and setup

### Test Categories
- **Posts API**: `posts.test.ts`
- **Comments API**: `comments.test.ts`
- **Reactions API**: `reactions.test.ts`
- **Communities API**: `community.test.ts`

### Test Helpers
- `setup.ts` - Base test setup and cleanup
- `globalSetup.ts` - Global test initialization
- `globalTeardown.ts` - Global test cleanup
- `loadEnv.ts` - Environment variable loading
- `index.ts` - Helper functions for creating test data

## Test Database Management

### Cleaning Test Data

The tests automatically clean up data between test runs using the cleanup functions in `setup.ts`. This includes:

- Users
- Communities
- Posts
- Comments
- Reactions
- Messages
- And other test data

### Database Reset

If you need to reset the test database completely:

```bash
# Option 1: Delete and recreate (destructive)
dropdb skool-clone_test
createdb skool-clone_test
pnpm test:setup-db

# Option 2: Reset using script (gentler)
TEST_RESET_DB=true pnpm test:integration
```

## Troubleshooting

### Common Issues

1. **"Database server not reachable"**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in `.env.test`
   - Verify network connectivity

2. **"Authentication failed"**
   - Check database credentials in DATABASE_URL
   - Ensure the test database user exists
   - Verify database permissions

3. **"Database does not exist"**
   - Run `pnpm test:setup-db` to create the database
   - Or manually create with `createdb skool-clone_test`

4. **"Migration failed"**
   - Ensure Prisma schema is valid
   - Check database connectivity
   - Verify migration files exist

### Debug Mode

Run tests with additional logging:

```bash
# Enable database query logging
DEBUG=prisma:* pnpm test:integration

# Enable test debug output
NODE_ENV=test LOG_LEVEL=debug pnpm test:integration
```

### Check Test Database

Connect to the test database to inspect data:

```bash
psql postgresql://skooluser:skoolpass@localhost:5432/skool-clone_test
```

## Best Practices

1. **Test Isolation**: Each test file creates its own test data using helper functions
2. **Database Cleanup**: Automatic cleanup prevents test interference
3. **Environment Separation**: Tests use a separate database from development
4. **Real Database Testing**: Integration tests use a real database for accuracy
5. **Fast Setup**: Global setup minimizes per-test configuration

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Use helper functions for test data creation
3. Ensure proper cleanup in `afterAll` blocks
4. Add tests to the appropriate category file
5. Update this documentation if needed