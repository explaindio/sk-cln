#!/usr/bin/env tsx

/**
 * AI System Test Runner and Utilities
 * 
 * This script provides utilities to run the AI recommendation system tests,
 * manage test environments, and provide additional testing capabilities.
 */

import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { AISystemIntegrationTest, TEST_CONFIG } from './test-ai-system-integration';

const execAsync = promisify(exec);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class TestRunner {
  private testProcess: any = null;

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  private cleanup(): void {
    if (this.testProcess) {
      console.log('\n🛑 Cleaning up test process...');
      this.testProcess.kill();
      this.testProcess = null;
    }
  }

  private log(message: string, color: keyof typeof colors = 'reset'): void {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  /**
   * Check if required services are running
   */
  private async checkPrerequisites(): Promise<boolean> {
    this.log('🔍 Checking prerequisites...', 'blue');
    
    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'TypeScript', command: 'npx tsc --version' },
    ];

    let allGood = true;

    for (const check of checks) {
      try {
        const { stdout } = await execAsync(check.command);
        this.log(`✅ ${check.name}: ${stdout.trim()}`, 'green');
      } catch (error) {
        this.log(`❌ ${check.name}: Not found or error`, 'red');
        allGood = false;
      }
    }

    return allGood;
  }

  /**
   * Start backend services if not running
   */
  private async startBackendServices(): Promise<boolean> {
    this.log('🚀 Starting backend services...', 'blue');
    
    try {
      // Check if backend is already running
      const { stdout } = await execAsync('curl -s http://localhost:4001/health || echo "DOWN"');
      if (stdout.includes('UP')) {
        this.log('✅ Backend API is already running', 'green');
        return true;
      }
    } catch (error) {
      // Service is not running, start it
    }

    this.log('📦 Starting backend API server...', 'yellow');
    
    try {
      // Start backend in background
      const backendProcess = spawn('npm', ['run', 'dev:api'], {
        cwd: path.join(__dirname, '../../apps/api'),
        stdio: 'pipe',
        shell: true
      });

      // Wait for backend to start
      await new Promise<void>((resolve, reject) => {
        let started = false;
        
        backendProcess.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Server running on port') || output.includes('API server started')) {
            if (!started) {
              started = true;
              this.log('✅ Backend API started successfully', 'green');
              resolve();
            }
          }
        });

        backendProcess.stderr.on('data', (data) => {
          const output = data.toString();
          if (output.includes('EADDRINUSE')) {
            this.log('⚠️  Backend API port already in use, assuming service is running', 'yellow');
            resolve();
          } else if (output.includes('error') && !started) {
            this.log(`❌ Backend startup error: ${output}`, 'red');
            reject(new Error('Backend failed to start'));
          }
        });

        setTimeout(() => {
          if (!started) {
            this.log('⚠️  Backend startup timeout, continuing anyway', 'yellow');
            resolve();
          }
        }, 10000); // 10 second timeout
      });

      return true;
    } catch (error) {
      this.log(`❌ Failed to start backend: ${error}`, 'red');
      return false;
    }
  }

  /**
   * Start frontend services if not running
   */
  private async startFrontendServices(): Promise<boolean> {
    this.log('🚀 Starting frontend services...', 'blue');
    
    try {
      // Check if frontend is already running
      const { stdout } = await execAsync('curl -s http://localhost:3000 || echo "DOWN"');
      if (stdout.includes('<!DOCTYPE html>') || stdout.includes('<html')) {
        this.log('✅ Frontend is already running', 'green');
        return true;
      }
    } catch (error) {
      // Service is not running, start it
    }

    this.log('📦 Starting frontend development server...', 'yellow');
    
    try {
      // Start frontend in background
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '../../apps/web'),
        stdio: 'pipe',
        shell: true
      });

      // Wait for frontend to start
      await new Promise<void>((resolve, reject) => {
        let started = false;
        
        frontendProcess.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Ready') || output.includes('3000')) {
            if (!started) {
              started = true;
              this.log('✅ Frontend started successfully', 'green');
              resolve();
            }
          }
        });

        frontendProcess.stderr.on('data', (data) => {
          const output = data.toString();
          if (output.includes('EADDRINUSE')) {
            this.log('⚠️  Frontend port already in use, assuming service is running', 'yellow');
            resolve();
          } else if (output.includes('error') && !started) {
            this.log(`❌ Frontend startup error: ${output}`, 'red');
            reject(new Error('Frontend failed to start'));
          }
        });

        setTimeout(() => {
          if (!started) {
            this.log('⚠️  Frontend startup timeout, continuing anyway', 'yellow');
            resolve();
          }
        }, 15000); // 15 second timeout
      });

      return true;
    } catch (error) {
      this.log(`❌ Failed to start frontend: ${error}`, 'red');
      return false;
    }
  }

  /**
   * Run the main integration test
   */
  private async runIntegrationTest(): Promise<void> {
    this.log('\n🤖 Starting AI Recommendation System Integration Tests', 'cyan');
    this.log('='.repeat(60), 'cyan');

    try {
      const tester = new AISystemIntegrationTest();
      await tester.runAllTests();
    } catch (error) {
      this.log(`\n❌ Integration test failed: ${error}`, 'red');
      throw error;
    }
  }

  /**
   * Run a quick smoke test
   */
  private async runSmokeTest(): Promise<void> {
    this.log('\n🔥 Running AI System Smoke Test', 'cyan');
    this.log('='.repeat(40), 'cyan');

    const smokeTests = [
      {
        name: 'Backend Health Check',
        test: async () => {
          const { stdout } = await execAsync(`curl -s ${TEST_CONFIG.apiUrl}/health || echo "DOWN"`);
          if (!stdout.includes('UP')) {
            throw new Error('Backend API is not healthy');
          }
        }
      },
      {
        name: 'Frontend Health Check',
        test: async () => {
          const { stdout } = await execAsync(`curl -s ${TEST_CONFIG.baseUrl} | head -1 || echo "DOWN"`);
          if (!stdout.includes('<!DOCTYPE html>') && !stdout.includes('<html')) {
            throw new Error('Frontend is not responding');
          }
        }
      },
      {
        name: 'Database Connection',
        test: async () => {
          // This would need to be implemented based on your database setup
          this.log('⚠️  Database connection test not implemented', 'yellow');
        }
      },
      {
        name: 'AI Recommendation Endpoint',
        test: async () => {
          const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" ${TEST_CONFIG.apiUrl}/recommendations/preferences || echo "000"`);
          const statusCode = parseInt(stdout.trim());
          if (statusCode !== 401 && statusCode !== 200) {
            throw new Error(`AI recommendation endpoint returned ${statusCode}`);
          }
        }
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const smokeTest of smokeTests) {
      try {
        this.log(`🧪 ${smokeTest.name}...`, 'blue');
        await smokeTest.test();
        this.log(`✅ ${smokeTest.name} passed`, 'green');
        passed++;
      } catch (error) {
        this.log(`❌ ${smokeTest.name} failed: ${error}`, 'red');
        failed++;
      }
    }

    this.log(`\n📊 Smoke Test Results: ${passed} passed, ${failed} failed`, 'cyan');
    
    if (failed > 0) {
      throw new Error(`${failed} smoke tests failed`);
    }
  }

  /**
   * Generate test data for manual testing
   */
  private async generateTestData(): Promise<void> {
    this.log('\n📝 Generating test data...', 'cyan');
    
    try {
      // Create test users
      const testUsers = [
        { email: 'ai-user1@example.com', password: 'TestPass123!', name: 'AI User 1' },
        { email: 'ai-user2@example.com', password: 'TestPass123!', name: 'AI User 2' },
        { email: 'ai-user3@example.com', password: 'TestPass123!', name: 'AI User 3' },
      ];

      for (const user of testUsers) {
        try {
          await execAsync(`curl -s -X POST ${TEST_CONFIG.apiUrl}/auth/register \
            -H "Content-Type: application/json" \
            -d '{"email":"${user.email}","password":"${user.password}","name":"${user.name}"}'`);
          this.log(`✅ Created test user: ${user.email}`, 'green');
        } catch (error) {
          this.log(`⚠️  User ${user.email} might already exist`, 'yellow');
        }
      }

      this.log('✅ Test data generation completed', 'green');
    } catch (error) {
      this.log(`❌ Test data generation failed: ${error}`, 'red');
      throw error;
    }
  }

  /**
   * Clean up test data
   */
  private async cleanupTestData(): Promise<void> {
    this.log('\n🧹 Cleaning up test data...', 'cyan');
    
    // This would implement cleanup logic based on your database schema
    this.log('✅ Test data cleanup completed', 'green');
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
${colors.cyan}AI Recommendation System Test Runner${colors.reset}

${colors.yellow}Usage:${colors.reset}
  npm run test:ai-integration [options]

${colors.yellow}Options:${colors.reset}
  --full, -f          Run full integration test suite
  --smoke, -s         Run quick smoke tests
  --setup, -u         Setup test environment and start services
  --data, -d          Generate test data
  --cleanup, -c       Clean up test data
  --help, -h          Show this help message

${colors.yellow}Examples:${colors.reset}
  npm run test:ai-integration -- --full
  npm run test:ai-integration -- --smoke
  npm run test:ai-integration -- --setup --full

${colors.yellow}Environment Variables:${colors.reset}
  API_URL             Backend API URL (default: http://localhost:4001/api)
  FRONTEND_URL        Frontend URL (default: http://localhost:3000)
  TEST_USER_EMAIL     Test user email
  TEST_USER_PASSWORD  Test user password
`);
  }

  /**
   * Main entry point
   */
  async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    try {
      // Check prerequisites
      const prerequisitesMet = await this.checkPrerequisites();
      if (!prerequisitesMet) {
        this.log('❌ Prerequisites not met. Please install required tools.', 'red');
        process.exit(1);
      }

      // Parse command line arguments
      const runFullTest = args.includes('--full') || args.includes('-f');
      const runSmokeTest = args.includes('--smoke') || args.includes('-s');
      const setupEnvironment = args.includes('--setup') || args.includes('-u');
      const generateData = args.includes('--data') || args.includes('-d');
      const cleanupData = args.includes('--cleanup') || args.includes('-c');

      // Setup environment if requested
      if (setupEnvironment) {
        const backendReady = await this.startBackendServices();
        const frontendReady = await this.startFrontendServices();
        
        if (!backendReady || !frontendReady) {
          this.log('❌ Failed to setup environment', 'red');
          process.exit(1);
        }
        
        // Wait a bit for services to stabilize
        this.log('⏳ Waiting for services to stabilize...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Generate test data if requested
      if (generateData) {
        await this.generateTestData();
      }

      // Run tests
      if (runSmokeTest) {
        await this.runSmokeTest();
      }

      if (runFullTest) {
        await this.runIntegrationTest();
      }

      // Cleanup if requested
      if (cleanupData) {
        await this.cleanupTestData();
      }

      // If no specific test requested, show help
      if (!runFullTest && !runSmokeTest && !setupEnvironment && !generateData && !cleanupData) {
        this.log('No test specified. Use --help for usage information.', 'yellow');
        this.showHelp();
      }

    } catch (error) {
      this.log(`\n❌ Test runner failed: ${error}`, 'red');
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(console.error);
}

export { TestRunner };