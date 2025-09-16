#!/usr/bin/env tsx

/**
 * AI Recommendation System Usage Example
 * 
 * This script demonstrates how to programmatically use the AI recommendation system
 * for testing and integration purposes.
 */

import axios from 'axios';
import { setTimeout } from 'timers/promises';

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:4001/api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  testUser: {
    email: 'example@demo.com',
    password: 'DemoPass123!',
    name: 'Demo User'
  }
};

// API Client setup
const apiClient = axios.create({
  baseURL: CONFIG.apiUrl,
  timeout: 10000,
});

// Add auth interceptor
let authToken: string | null = null;

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/**
 * Example 1: Basic AI Recommendation Flow
 */
async function basicRecommendationFlow() {
  console.log('🤖 Example 1: Basic AI Recommendation Flow');
  console.log('='.repeat(50));

  try {
    // Step 1: Register or login user
    console.log('🔐 Step 1: Authenticating user...');
    
    let userId: string;
    try {
      // Try to register
      const registerResponse = await apiClient.post('/auth/register', {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password,
        name: CONFIG.testUser.name,
      });
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
      console.log('✅ User registered successfully');
    } catch (error: any) {
      if (error.response?.status === 400) {
        // User exists, login instead
        const loginResponse = await apiClient.post('/auth/login', {
          email: CONFIG.testUser.email,
          password: CONFIG.testUser.password,
        });
        authToken = loginResponse.data.token;
        userId = loginResponse.data.user.id;
        console.log('✅ User logged in successfully');
      } else {
        throw error;
      }
    }

    // Step 2: Set user preferences
    console.log('\n⚙️  Step 2: Setting user preferences...');
    await apiClient.put('/recommendations/preferences', {
      categories: ['technology', 'education', 'programming'],
      interests: ['ai', 'machine-learning', 'web-development'],
      recommendationFrequency: 'daily',
      optOut: false
    });
    console.log('✅ Preferences updated');

    // Step 3: Track some user behavior
    console.log('\n📊 Step 3: Tracking user behavior...');
    await apiClient.post('/analytics/behavioral/events/batch', {
      events: [
        {
          type: 'search',
          metadata: { query: 'machine learning tutorials', resultCount: 10 },
          userId: userId,
          sessionId: `demo_session_${Date.now()}`,
          timestamp: Date.now()
        },
        {
          type: 'view',
          contentId: 'demo_content_1',
          contentType: 'post',
          userId: userId,
          sessionId: `demo_session_${Date.now()}`,
          timestamp: Date.now()
        }
      ]
    });
    console.log('✅ Behavioral events tracked');

    // Step 4: Get AI recommendations
    console.log('\n🎯 Step 4: Getting AI recommendations...');
    const recommendationsResponse = await apiClient.post('/recommendations', {
      limit: 5,
      categories: ['technology'],
      includeExplanations: true,
      minSimilarity: 0.3
    });

    const recommendations = recommendationsResponse.data.data.recommendations;
    console.log(`✅ Received ${recommendations.length} recommendations`);

    // Display recommendations
    recommendations.forEach((rec: any, index: number) => {
      console.log(`\n  ${index + 1}. ${rec.title} (${rec.type})`);
      console.log(`     Score: ${(rec.score * 100).toFixed(1)}%`);
      console.log(`     Reason: ${rec.reason}`);
      if (rec.explanation) {
        console.log(`     Explanation: ${rec.explanation.reasoning}`);
      }
    });

    // Step 5: Provide feedback
    if (recommendations.length > 0) {
      console.log('\n👍 Step 5: Providing feedback...');
      await apiClient.post('/recommendations/feedback', {
        recommendationId: recommendations[0].id,
        rating: 4,
        comment: 'This looks interesting!',
        helpful: true
      });
      console.log('✅ Feedback submitted');
    }

    // Step 6: Check behavioral metrics
    console.log('\n📈 Step 6: Checking behavioral metrics...');
    const metricsResponse = await apiClient.get(`/analytics/behavioral/user/${userId}/metrics`);
    const metrics = metricsResponse.data.data;
    console.log(`✅ Engagement Score: ${metrics.engagementScore}`);
    console.log(`✅ Event Count: ${metrics.eventCount}`);

    return { success: true, recommendations, metrics };

  } catch (error) {
    console.error('❌ Basic recommendation flow failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 2: Privacy Settings Demo
 */
async function privacySettingsDemo() {
  console.log('\n\n🔒 Example 2: Privacy Settings Demo');
  console.log('='.repeat(50));

  try {
    // Check current preferences
    console.log('📋 Current preferences:');
    const prefsResponse = await apiClient.get('/recommendations/preferences');
    const prefs = prefsResponse.data.data;
    console.log(`  Opt-out: ${prefs.optOut}`);
    console.log(`  Categories: ${prefs.categories.join(', ')}`);
    console.log(`  Frequency: ${prefs.recommendationFrequency}`);

    // Enable opt-out
    console.log('\n🚫 Enabling opt-out...');
    await apiClient.put('/recommendations/preferences', { optOut: true });
    console.log('✅ Opt-out enabled');

    // Try to get recommendations (should return empty)
    console.log('\n🎯 Getting recommendations with opt-out enabled...');
    const optOutResponse = await apiClient.post('/recommendations', { limit: 5 });
    const optOutRecs = optOutResponse.data.data.recommendations;
    console.log(`✅ Received ${optOutRecs.length} recommendations (should be 0)`);

    // Disable opt-out
    console.log('\n✅ Disabling opt-out...');
    await apiClient.put('/recommendations/preferences', { optOut: false });
    console.log('✅ Opt-out disabled');

    return { success: true };

  } catch (error) {
    console.error('❌ Privacy settings demo failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 3: Advanced Behavioral Tracking
 */
async function advancedBehavioralTracking() {
  console.log('\n\n📊 Example 3: Advanced Behavioral Tracking');
  console.log('='.repeat(50));

  try {
    const sessionId = `demo_session_${Date.now()}`;

    // Track various user interactions
    const events = [
      {
        type: 'view',
        contentId: 'course_123',
        contentType: 'course',
        metadata: { url: '/courses/ai-fundamentals', referrer: '/search' },
        userId: 'demo_user',
        sessionId: sessionId,
        timestamp: Date.now()
      },
      {
        type: 'time_spent',
        contentId: 'course_123',
        contentType: 'course',
        metadata: { 
          timeSpent: 120000, // 2 minutes
          scrollDepth: 75,
          readProgress: 60
        },
        userId: 'demo_user',
        sessionId: sessionId,
        timestamp: Date.now() + 120000
      },
      {
        type: 'search',
        metadata: { 
          query: 'python machine learning',
          queryLength: 23,
          resultCount: 15,
          hasFilters: true
        },
        userId: 'demo_user',
        sessionId: sessionId,
        timestamp: Date.now() + 240000
      }
    ];

    console.log('📤 Sending behavioral events...');
    await apiClient.post('/analytics/behavioral/events/batch', { events });
    console.log('✅ Behavioral events sent');

    // Wait a moment for processing
    await setTimeout(1000);

    // Get updated metrics
    console.log('\n📈 Getting updated behavioral metrics...');
    const metricsResponse = await apiClient.get('/analytics/behavioral/user/demo_user/metrics');
    const metrics = metricsResponse.data.data;
    
    console.log(`✅ Updated metrics:`);
    console.log(`   Engagement Score: ${metrics.engagementScore}`);
    console.log(`   Event Count: ${metrics.eventCount}`);

    return { success: true, metrics };

  } catch (error) {
    console.error('❌ Advanced behavioral tracking failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 4: Error Handling Demo
 */
async function errorHandlingDemo() {
  console.log('\n\n🛡️  Example 4: Error Handling Demo');
  console.log('='.repeat(50));

  try {
    // Test 1: Invalid authentication
    console.log('🔒 Test 1: Invalid authentication...');
    try {
      const invalidClient = axios.create({
        baseURL: CONFIG.apiUrl,
        headers: { Authorization: 'Bearer invalid_token' }
      });
      
      await invalidClient.get('/recommendations/preferences');
      console.log('❌ Should have failed with invalid auth');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid authentication');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }

    // Test 2: Invalid input validation
    console.log('\n📝 Test 2: Invalid input validation...');
    try {
      await apiClient.post('/recommendations/feedback', {
        recommendationId: '',  // Empty ID
        rating: 6,             // Invalid rating (should be 1-5)
        comment: 'x'.repeat(1000) // Too long
      });
      console.log('❌ Should have failed with invalid input');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid input');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }

    // Test 3: Missing required fields
    console.log('\n❌ Test 3: Missing required fields...');
    try {
      await apiClient.post('/recommendations', {
        // Missing required limit parameter
      });
      console.log('❌ Should have failed with missing fields');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected missing fields');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error handling demo failed:', error);
    return { success: false, error };
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 AI Recommendation System Examples');
  console.log('='.repeat(60));
  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log(`Frontend URL: ${CONFIG.frontendUrl}`);
  console.log('='.repeat(60));

  const examples = [
    { name: 'Basic Recommendation Flow', func: basicRecommendationFlow },
    { name: 'Privacy Settings Demo', func: privacySettingsDemo },
    { name: 'Advanced Behavioral Tracking', func: advancedBehavioralTracking },
    { name: 'Error Handling Demo', func: errorHandlingDemo },
  ];

  const results = [];

  for (const example of examples) {
    try {
      console.log(`\n\n📋 Running: ${example.name}`);
      console.log('='.repeat(60));
      
      const result = await example.func();
      results.push({ name: example.name, ...result });
      
      if (result.success) {
        console.log(`✅ ${example.name} completed successfully`);
      } else {
        console.log(`❌ ${example.name} failed: ${result.error}`);
      }
      
      // Small delay between examples
      await setTimeout(1000);
      
    } catch (error) {
      console.error(`❌ ${example.name} crashed:`, error);
      results.push({ name: example.name, success: false, error });
    }
  }

  // Summary
  console.log('\n\n📊 Example Execution Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status} ${result.name}\x1b[0m`);
  });

  return { success: failed === 0, results };
}

/**
 * Interactive demo mode
 */
async function interactiveDemo() {
  console.log('🎮 Interactive AI Recommendation System Demo');
  console.log('='.repeat(60));
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (question: string): Promise<string> => {
    return new Promise(resolve => {
      rl.question(question, resolve);
    });
  };

  try {
    // Get user credentials
    const email = await askQuestion('Enter email (or press Enter for demo user): ');
    const password = await askQuestion('Enter password (or press Enter for demo password): ');
    
    if (email) CONFIG.testUser.email = email;
    if (password) CONFIG.testUser.password = password;

    console.log('\n🔐 Logging in...');
    
    // Authenticate
    try {
      const loginResponse = await apiClient.post('/auth/login', {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password,
      });
      authToken = loginResponse.data.token;
      console.log('✅ Authenticated successfully');
    } catch (error) {
      console.log('❌ Authentication failed, trying to register...');
      const registerResponse = await apiClient.post('/auth/register', {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password,
        name: CONFIG.testUser.name,
      });
      authToken = registerResponse.data.token;
      console.log('✅ Registered and authenticated successfully');
    }

    // Interactive menu
    while (true) {
      console.log('\n📋 Interactive Menu:');
      console.log('1. Get AI Recommendations');
      console.log('2. Track User Behavior');
      console.log('3. Update Preferences');
      console.log('4. Submit Feedback');
      console.log('5. View Metrics');
      console.log('6. Run All Examples');
      console.log('0. Exit');
      
      const choice = await askQuestion('\nEnter your choice (0-6): ');
      
      switch (choice) {
        case '1':
          await basicRecommendationFlow();
          break;
        case '2':
          await advancedBehavioralTracking();
          break;
        case '3':
          await privacySettingsDemo();
          break;
        case '4':
          console.log('\n📝 Submit feedback feature coming soon...');
          break;
        case '5':
          console.log('\n📊 View metrics feature coming soon...');
          break;
        case '6':
          await runAllExamples();
          break;
        case '0':
          console.log('\n👋 Goodbye!');
          rl.close();
          return;
        default:
          console.log('\n❌ Invalid choice. Please try again.');
      }
    }
    
  } catch (error) {
    console.error('❌ Interactive demo failed:', error);
    rl.close();
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    await interactiveDemo();
  } else if (args.includes('--quick') || args.includes('-q')) {
    await runAllExamples();
  } else {
    // Show help
    console.log('AI Recommendation System Examples');
    console.log('Usage:');
    console.log('  tsx test-ai-system-example.ts --quick    # Run all examples');
    console.log('  tsx test-ai-system-example.ts --interactive  # Interactive mode');
    console.log('');
    console.log('Running quick demo...');
    await runAllExamples();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { 
  basicRecommendationFlow, 
  privacySettingsDemo, 
  advancedBehavioralTracking, 
  errorHandlingDemo,
  runAllExamples,
  interactiveDemo 
};