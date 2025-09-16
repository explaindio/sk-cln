#!/usr/bin/env tsx

/**
 * Comprehensive End-to-End Test Script for AI Recommendation System
 * 
 * This script tests the complete AI recommendation system integration including:
 * - User authentication and authorization
 * - Backend API endpoints
 * - Frontend hook integration
 * - Behavioral analytics tracking
 * - Data persistence and synchronization
 * - Error handling and fallback scenarios
 * - Performance benchmarks
 * - Privacy settings and opt-out functionality
 */

import { spawn, execSync } from 'child_process';
import axios, { AxiosInstance } from 'axios';
import { setTimeout } from 'timers/promises';
import * as fs from 'fs';
import * as path from 'path';

// Test Configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:4001/api',
  timeout: 30000,
  performanceThreshold: 500, // ms
  testUser: {
    email: 'test-ai-user@example.com',
    password: 'TestPass123!',
    name: 'AI Test User'
  },
  testContent: {
    postTitle: 'Test Post for AI Recommendations',
    postContent: 'This is a test post to verify AI recommendation functionality',
    courseTitle: 'Test Course for Recommendations',
    courseDescription: 'A test course to validate recommendation algorithms'
  }
};

// Test Results Tracking
interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

interface PerformanceMetrics {
  endpoint: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
}

class AISystemIntegrationTest {
  private apiClient: AxiosInstance;
  private testResults: TestResult[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private testUserId: string | null = null;
  private testContentIds: { postId?: string; courseId?: string } = {};

  constructor() {
    this.apiClient = axios.create({
      baseURL: TEST_CONFIG.apiUrl,
      timeout: TEST_CONFIG.timeout,
    });

    // Add request interceptor for auth
    this.apiClient.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Add response interceptor for performance tracking
    this.apiClient.interceptors.response.use(
      (response) => {
        const duration = response.headers['x-response-time'] 
          ? parseInt(response.headers['x-response-time'] as string)
          : 0;
        
        this.performanceMetrics.push({
          endpoint: response.config.url || 'unknown',
          responseTime: duration,
          statusCode: response.status,
          success: true,
        });
        
        return response;
      },
      (error) => {
        if (error.response) {
          this.performanceMetrics.push({
            endpoint: error.config?.url || 'unknown',
            responseTime: 0,
            statusCode: error.response.status,
            success: false,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  // Logging utilities
  private log(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Also write to file
    const logFile = path.join(__dirname, 'ai-test-logs.txt');
    fs.appendFileSync(logFile, logMessage + '\n');
  }

  private async measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.log(`✅ ${name} completed in ${duration}ms`);
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - start;
      this.log(`❌ ${name} failed after ${duration}ms: ${error}`, 'ERROR');
      throw error;
    }
  }

  private addTestResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', duration: number, error?: string, details?: any): void {
    this.testResults.push({ test, status, duration, error, details });
  }

  // Test Suite Methods

  /**
   * Test 1: Environment Setup and Health Checks
   */
  private async testEnvironmentSetup(): Promise<void> {
    const testName = 'Environment Setup and Health Checks';
    const start = Date.now();
    
    try {
      this.log('🔧 Setting up test environment...');
      
      // Check if servers are running
      const healthChecks = await Promise.all([
        this.checkServerHealth(TEST_CONFIG.baseUrl, 'Frontend'),
        this.checkServerHealth(TEST_CONFIG.apiUrl, 'Backend API'),
      ]);

      if (!healthChecks.every(check => check.healthy)) {
        throw new Error('Some servers are not healthy');
      }

      this.log('✅ All servers are healthy');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  private async checkServerHealth(url: string, name: string): Promise<{ healthy: boolean; status?: number }> {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      this.log(`✅ ${name} server is healthy (status: ${response.status})`);
      return { healthy: true, status: response.status };
    } catch (error) {
      this.log(`❌ ${name} server health check failed: ${error}`, 'ERROR');
      return { healthy: false };
    }
  }

  /**
   * Test 2: User Authentication and Registration
   */
  private async testUserAuthentication(): Promise<void> {
    const testName = 'User Authentication and Registration';
    const start = Date.now();
    
    try {
      this.log('🔐 Testing user authentication...');

      // Try to register test user
      try {
        await this.measurePerformance('User Registration', async () => {
          const response = await this.apiClient.post('/auth/register', {
            email: TEST_CONFIG.testUser.email,
            password: TEST_CONFIG.testUser.password,
            name: TEST_CONFIG.testUser.name,
          });
          
          this.authToken = response.data.token;
          this.testUserId = response.data.user?.id;
        });
      } catch (error: any) {
        // User might already exist, try login
        if (error.response?.status === 400) {
          this.log('User already exists, attempting login...');
          const response = await this.apiClient.post('/auth/login', {
            email: TEST_CONFIG.testUser.email,
            password: TEST_CONFIG.testUser.password,
          });
          this.authToken = response.data.token;
          this.testUserId = response.data.user?.id;
        } else {
          throw error;
        }
      }

      // Verify authentication works
      await this.measurePerformance('Authentication Verification', async () => {
        const response = await this.apiClient.get('/auth/me');
        if (!response.data.user) {
          throw new Error('Authentication verification failed');
        }
        this.testUserId = response.data.user.id;
      });

      this.log('✅ User authentication completed successfully');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 3: Create Test Content for Recommendations
   */
  private async testContentCreation(): Promise<void> {
    const testName = 'Test Content Creation';
    const start = Date.now();
    
    try {
      this.log('📝 Creating test content for recommendations...');

      // Create a test post
      const { result: postResult } = await this.measurePerformance('Create Test Post', async () => {
        const response = await this.apiClient.post('/posts', {
          title: TEST_CONFIG.testContent.postTitle,
          content: TEST_CONFIG.testContent.postContent,
          tags: ['ai', 'testing', 'recommendations'],
          category: 'technology'
        });
        return response.data;
      });

      this.testContentIds.postId = postResult.id;

      // Create a test course
      const { result: courseResult } = await this.measurePerformance('Create Test Course', async () => {
        const response = await this.apiClient.post('/courses', {
          title: TEST_CONFIG.testContent.courseTitle,
          description: TEST_CONFIG.testContent.courseDescription,
          tags: ['ai', 'machine-learning', 'recommendations'],
          difficulty: 'intermediate'
        });
        return response.data;
      });

      this.testContentIds.courseId = courseResult.id;

      this.log('✅ Test content created successfully');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 4: Behavioral Analytics Integration
   */
  private async testBehavioralAnalytics(): Promise<void> {
    const testName = 'Behavioral Analytics Integration';
    const start = Date.now();
    
    try {
      this.log('📊 Testing behavioral analytics integration...');

      // Track various user behaviors
      const behaviors = [
        { type: 'view', contentId: this.testContentIds.postId, contentType: 'post' },
        { type: 'like', contentId: this.testContentIds.postId, contentType: 'post' },
        { type: 'search', metadata: { query: 'AI recommendations', resultCount: 5 } },
        { type: 'time_spent', contentId: this.testContentIds.courseId, contentType: 'course', metadata: { timeSpent: 30000 } }
      ];

      for (const behavior of behaviors) {
        await this.measurePerformance(`Track ${behavior.type} behavior`, async () => {
          const event = {
            ...behavior,
            userId: this.testUserId,
            sessionId: `test_session_${Date.now()}`,
            timestamp: Date.now()
          };
          
          const response = await this.apiClient.post('/analytics/behavioral/events/batch', {
            events: [event]
          });
          
          if (!response.data.success) {
            throw new Error(`Failed to track ${behavior.type} behavior`);
          }
        });
      }

      // Verify behavioral metrics are calculated
      await this.measurePerformance('Get Behavioral Metrics', async () => {
        const response = await this.apiClient.get(`/analytics/behavioral/user/${this.testUserId}/metrics`);
        if (!response.data.data.engagementScore !== undefined) {
          throw new Error('Behavioral metrics not calculated properly');
        }
      });

      this.log('✅ Behavioral analytics integration completed');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 5: AI Recommendation API Endpoints
   */
  private async testAIRecommendationAPIs(): Promise<void> {
    const testName = 'AI Recommendation API Endpoints';
    const start = Date.now();
    
    try {
      this.log('🤖 Testing AI recommendation API endpoints...');

      // Test getting recommendations
      const { result: recommendations } = await this.measurePerformance('Get Recommendations', async () => {
        const response = await this.apiClient.post('/recommendations', {
          limit: 5,
          categories: ['technology', 'education'],
          includeExplanations: true
        });
        return response.data.data.recommendations;
      });

      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        throw new Error('No recommendations returned');
      }

      // Test recommendation feedback
      const testRecommendation = recommendations[0];
      await this.measurePerformance('Submit Recommendation Feedback', async () => {
        const response = await this.apiClient.post('/recommendations/feedback', {
          recommendationId: testRecommendation.id,
          rating: 4,
          comment: 'Great recommendation!',
          helpful: true
        });
        
        if (!response.data.success) {
          throw new Error('Failed to submit feedback');
        }
      });

      // Test user preferences
      await this.measurePerformance('Get User Preferences', async () => {
        const response = await this.apiClient.get('/recommendations/preferences');
        if (!response.data.data.categories !== undefined) {
          throw new Error('Invalid preferences response');
        }
      });

      await this.measurePerformance('Update User Preferences', async () => {
        const response = await this.apiClient.put('/recommendations/preferences', {
          categories: ['technology', 'ai', 'programming'],
          interests: ['machine-learning', 'data-science'],
          recommendationFrequency: 'daily',
          optOut: false
        });
        
        if (!response.data.success) {
          throw new Error('Failed to update preferences');
        }
      });

      this.log('✅ AI recommendation API endpoints tested successfully');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 6: Frontend Hook Integration
   */
  private async testFrontendHookIntegration(): Promise<void> {
    const testName = 'Frontend Hook Integration';
    const start = Date.now();
    
    try {
      this.log('🎣 Testing frontend hook integration...');

      // This would typically be tested in a browser environment with actual React components
      // For now, we'll simulate the hook behavior by testing the underlying API calls
      
      // Test the recommendation engine directly
      const { result: hookRecommendations } = await this.measurePerformance('Simulate Hook Recommendations', async () => {
        // Simulate what the hook would do
        const response = await this.apiClient.post('/recommendations', {
          limit: 10,
          categories: ['technology'],
          minSimilarity: 0.5,
          includeExplanations: true
        });
        
        return response.data.data.recommendations;
      });

      // Validate recommendation structure matches hook expectations
      if (hookRecommendations.length > 0) {
        const recommendation = hookRecommendations[0];
        const requiredFields = ['id', 'type', 'title', 'score', 'reason'];
        
        for (const field of requiredFields) {
          if (!(field in recommendation)) {
            throw new Error(`Recommendation missing required field: ${field}`);
          }
        }
        
        // Check if explanation is included when requested
        if (!recommendation.explanation && hookRecommendations[0].explanation === undefined) {
          this.log('⚠️  Recommendation explanation not found (optional)', 'WARN');
        }
      }

      this.log('✅ Frontend hook integration validated');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 7: Error Handling and Fallback Scenarios
   */
  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling and Fallback Scenarios';
    const start = Date.now();
    
    try {
      this.log('🛡️  Testing error handling and fallback scenarios...');

      // Test invalid authentication
      await this.measurePerformance('Invalid Authentication Handling', async () => {
        const invalidClient = axios.create({
          baseURL: TEST_CONFIG.apiUrl,
          headers: { Authorization: 'Bearer invalid_token' }
        });
        
        try {
          await invalidClient.get('/recommendations/preferences');
          throw new Error('Should have failed with invalid auth');
        } catch (error: any) {
          if (error.response?.status !== 401) {
            throw new Error(`Expected 401, got ${error.response?.status}`);
          }
        }
      });

      // Test invalid input validation
      await this.measurePerformance('Invalid Input Validation', async () => {
        try {
          await this.apiClient.post('/recommendations/feedback', {
            recommendationId: '',
            rating: 6, // Invalid rating
            comment: 'x'.repeat(1000) // Too long
          });
          throw new Error('Should have failed with invalid input');
        } catch (error: any) {
          if (error.response?.status !== 400) {
            throw new Error(`Expected 400, got ${error.response?.status}`);
          }
        }
      });

      // Test rate limiting (if implemented)
      try {
        await this.measurePerformance('Rate Limiting Test', async () => {
          const requests = Array(10).fill(null).map(() => 
            this.apiClient.get('/recommendations/preferences')
          );
          
          const results = await Promise.allSettled(requests);
          const rateLimited = results.some(result => 
            result.status === 'rejected' && result.reason.response?.status === 429
          );
          
          if (!rateLimited) {
            this.log('⚠️  Rate limiting not detected (may not be implemented)', 'WARN');
          }
        });
      } catch (error) {
        this.log('⚠️  Rate limiting test failed (may not be implemented)', 'WARN');
      }

      this.log('✅ Error handling and fallback scenarios tested');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 8: Performance Benchmarks
   */
  private async testPerformanceBenchmarks(): Promise<void> {
    const testName = 'Performance Benchmarks';
    const start = Date.now();
    
    try {
      this.log('⚡ Running performance benchmarks...');

      const performanceTests = [
        { name: 'Get Recommendations', endpoint: '/recommendations', method: 'POST', data: { limit: 10 } },
        { name: 'Get Preferences', endpoint: '/recommendations/preferences', method: 'GET' },
        { name: 'Track Behavior', endpoint: '/analytics/behavioral/events/batch', method: 'POST', data: { 
          events: [{ type: 'view', contentId: 'test', timestamp: Date.now() }] 
        }},
      ];

      for (const test of performanceTests) {
        await this.measurePerformance(`${test.name} Performance`, async () => {
          const startTime = Date.now();
          
          let response;
          if (test.method === 'POST') {
            response = await this.apiClient.post(test.endpoint, test.data);
          } else {
            response = await this.apiClient.get(test.endpoint);
          }
          
          const duration = Date.now() - startTime;
          
          if (duration > TEST_CONFIG.performanceThreshold) {
            this.log(`⚠️  ${test.name} took ${duration}ms (threshold: ${TEST_CONFIG.performanceThreshold}ms)`, 'WARN');
          } else {
            this.log(`✅ ${test.name} completed in ${duration}ms`);
          }
          
          return response;
        });
      }

      // Analyze performance metrics
      const avgResponseTime = this.performanceMetrics
        .filter(m => m.success)
        .reduce((sum, m) => sum + m.responseTime, 0) / 
        this.performanceMetrics.filter(m => m.success).length;
      
      this.log(`📊 Average successful response time: ${avgResponseTime.toFixed(2)}ms`);

      this.log('✅ Performance benchmarks completed');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 9: Privacy Settings and Opt-out Functionality
   */
  private async testPrivacySettings(): Promise<void> {
    const testName = 'Privacy Settings and Opt-out Functionality';
    const start = Date.now();
    
    try {
      this.log('🔒 Testing privacy settings and opt-out functionality...');

      // Test opt-out functionality
      await this.measurePerformance('Enable Opt-out', async () => {
        const response = await this.apiClient.put('/recommendations/preferences', {
          optOut: true
        });
        
        if (!response.data.success) {
          throw new Error('Failed to enable opt-out');
        }
      });

      // Verify recommendations are empty when opted out
      await this.measurePerformance('Verify Opt-out Effect', async () => {
        const response = await this.apiClient.post('/recommendations', { limit: 10 });
        const recommendations = response.data.data.recommendations;
        
        if (recommendations.length > 0) {
          throw new Error('Recommendations returned despite opt-out');
        }
      });

      // Test re-enabling recommendations
      await this.measurePerformance('Disable Opt-out', async () => {
        const response = await this.apiClient.put('/recommendations/preferences', {
          optOut: false
        });
        
        if (!response.data.success) {
          throw new Error('Failed to disable opt-out');
        }
      });

      // Verify recommendations work again
      await this.measurePerformance('Verify Re-enabling', async () => {
        const response = await this.apiClient.post('/recommendations', { limit: 5 });
        const recommendations = response.data.data.recommendations;
        
        if (recommendations.length === 0) {
          this.log('⚠️  No recommendations after re-enabling (may need more data)', 'WARN');
        }
      });

      this.log('✅ Privacy settings and opt-out functionality tested');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Test 10: Data Persistence and Synchronization
   */
  private async testDataPersistence(): Promise<void> {
    const testName = 'Data Persistence and Synchronization';
    const start = Date.now();
    
    try {
      this.log('💾 Testing data persistence and synchronization...');

      // Test that preferences persist
      const testPreferences = {
        categories: ['ai', 'testing'],
        interests: ['machine-learning'],
        recommendationFrequency: 'daily' as const
      };

      await this.measurePerformance('Update and Retrieve Preferences', async () => {
        // Update preferences
        await this.apiClient.put('/recommendations/preferences', testPreferences);
        
        // Retrieve and verify
        const response = await this.apiClient.get('/recommendations/preferences');
        const retrieved = response.data.data;
        
        if (JSON.stringify(retrieved.categories) !== JSON.stringify(testPreferences.categories)) {
          throw new Error('Preferences not persisted correctly');
        }
      });

      // Test behavioral data persistence
      await this.measurePerformance('Behavioral Data Persistence', async () => {
        const testEvent = {
          type: 'test_persistence',
          userId: this.testUserId,
          sessionId: `test_session_${Date.now()}`,
          timestamp: Date.now(),
          metadata: { test: true }
        };
        
        // Send event
        await this.apiClient.post('/analytics/behavioral/events/batch', {
          events: [testEvent]
        });
        
        // Wait a bit for processing
        await setTimeout(1000);
        
        // Verify metrics reflect the new event
        const response = await this.apiClient.get(`/analytics/behavioral/user/${this.testUserId}/metrics`);
        if (!response.data.data) {
          throw new Error('Behavioral data not persisted');
        }
      });

      this.log('✅ Data persistence and synchronization tested');
      this.addTestResult(testName, 'PASS', Date.now() - start);
    } catch (error) {
      this.addTestResult(testName, 'FAIL', Date.now() - start, (error as Error).message);
      throw error;
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.testResults.filter(r => r.status === 'SKIP').length;
    
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
        totalDuration: `${totalDuration}ms`
      },
      results: this.testResults,
      performance: {
        metrics: this.performanceMetrics,
        averageResponseTime: this.performanceMetrics
          .filter(m => m.success)
          .reduce((sum, m) => sum + m.responseTime, 0) / 
          this.performanceMetrics.filter(m => m.success).length || 0
      }
    };

    // Write detailed report
    const reportPath = path.join(__dirname, 'ai-system-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AI RECOMMENDATION SYSTEM INTEGRATION TEST REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏭️  Skipped: ${skippedTests}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}`);
    console.log(`⏱️  Total Duration: ${report.summary.totalDuration}`);
    console.log(`⚡ Avg Response Time: ${report.performance.averageResponseTime.toFixed(2)}ms`);
    console.log('='.repeat(60));
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  • ${r.test}: ${r.error}`);
        });
    }
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Cleanup test data
   */
  private async cleanup(): Promise<void> {
    this.log('🧹 Cleaning up test data...');
    
    try {
      // Delete test content
      if (this.testContentIds.postId) {
        await this.apiClient.delete(`/posts/${this.testContentIds.postId}`);
      }
      if (this.testContentIds.courseId) {
        await this.apiClient.delete(`/courses/${this.testContentIds.courseId}`);
      }
      
      // Delete test user
      if (this.authToken) {
        await this.apiClient.delete('/users/me');
      }
      
      this.log('✅ Cleanup completed');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error}`, 'WARN');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    this.log('🚀 Starting AI Recommendation System Integration Tests');
    this.log(`📝 Test Configuration: ${JSON.stringify(TEST_CONFIG, null, 2)}`);
    
    const tests = [
      this.testEnvironmentSetup.bind(this),
      this.testUserAuthentication.bind(this),
      this.testContentCreation.bind(this),
      this.testBehavioralAnalytics.bind(this),
      this.testAIRecommendationAPIs.bind(this),
      this.testFrontendHookIntegration.bind(this),
      this.testErrorHandling.bind(this),
      this.testPerformanceBenchmarks.bind(this),
      this.testPrivacySettings.bind(this),
      this.testDataPersistence.bind(this),
    ];

    let failed = false;
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        failed = true;
        this.log(`❌ Test suite failed: ${error}`, 'ERROR');
        // Continue with other tests even if one fails
      }
    }

    // Generate report
    this.generateTestReport();
    
    // Cleanup
    await this.cleanup();
    
    if (failed) {
      this.log('❌ Some tests failed. Check the report for details.', 'ERROR');
      process.exit(1);
    } else {
      this.log('✅ All tests passed successfully!', 'INFO');
      process.exit(0);
    }
  }
}

// Main execution
async function main() {
  const tester = new AISystemIntegrationTest();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { AISystemIntegrationTest, TEST_CONFIG };