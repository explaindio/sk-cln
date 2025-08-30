import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
const envFile = path.resolve(__dirname, '../../../.env.test');

try {
  config({ path: envFile });
  console.log('✅ Test environment variables loaded from .env.test');
} catch (error) {
  console.warn('⚠️ Could not load .env.test file, using existing environment variables');
}

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';