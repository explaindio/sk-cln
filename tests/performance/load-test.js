// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests under 500ms
    'errors': ['rate<0.1'],              // Error rate under 10%
    'api_latency': ['p(95)<300'],        // API latency under 300ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Setup function - runs once
export function setup() {
  // Create test user
  const signupRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
    email: `loadtest_${Date.now()}@test.com`,
    username: `loadtest_${Date.now()}`,
    password: 'Password123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(signupRes, {
    'test user created': (r) => r.status === 201
  });

  const { token } = JSON.parse(signupRes.body);
  return { token };
}

export default function(data) {
  const { token } = data;

  // Scenario 1: Browse posts (60% of traffic)
  if (Math.random() < 0.6) {
    browsePosts();
  }
  // Scenario 2: Create content (20% of traffic)
  else if (Math.random() < 0.8) {
    createContent(token);
  }
  // Scenario 3: Search (20% of traffic)
  else {
    searchContent();
  }

  sleep(1);
}

function browsePosts() {
  // Get posts list
  const startTime = Date.now();
  const postsRes = http.get(`${BASE_URL}/api/posts?page=1&limit=20`);
  apiLatency.add(Date.now() - startTime);

  const success = check(postsRes, {
    'posts loaded': (r) => r.status === 200,
    'has posts': (r) => JSON.parse(r.body).posts.length > 0
  });

  errorRate.add(!success);

  if (success && postsRes.body) {
    const posts = JSON.parse(postsRes.body).posts;

    // View random post
    if (posts.length > 0) {
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      const postRes = http.get(`${BASE_URL}/api/posts/${randomPost.id}`);

      check(postRes, {
        'post loaded': (r) => r.status === 200
      });
    }
  }
}

function createContent(token) {
  const postData = {
    title: `Load Test Post ${Date.now()}`,
    content: 'This is a load test post content. '.repeat(10),
    communityId: 'test-community',
    tags: ['loadtest', 'performance']
  };

  const startTime = Date.now();
  const createRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(postData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  );
  apiLatency.add(Date.now() - startTime);

  const success = check(createRes, {
    'post created': (r) => r.status === 201,
    'has id': (r) => JSON.parse(r.body).id !== undefined
  });

  errorRate.add(!success);

  if (success) {
    const post = JSON.parse(createRes.body);

    // Add comment
    const commentRes = http.post(
      `${BASE_URL}/api/posts/${post.id}/comments`,
      JSON.stringify({
        content: 'Load test comment'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    check(commentRes, {
      'comment added': (r) => r.status === 201
    });
  }
}

function searchContent() {
  const searchTerms = ['javascript', 'react', 'tutorial', 'guide', 'help'];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const startTime = Date.now();
  const searchRes = http.get(`${BASE_URL}/api/search?q=${term}`);
  apiLatency.add(Date.now() - startTime);

  const success = check(searchRes, {
    'search completed': (r) => r.status === 200,
    'has results': (r) => JSON.parse(r.body).results !== undefined
  });

  errorRate.add(!success);
}

// Teardown function - runs once
export function teardown(data) {
  // Clean up test data if needed
  console.log('Load test completed');
}