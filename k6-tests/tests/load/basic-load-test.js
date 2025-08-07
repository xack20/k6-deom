/**
 * Basic Load Test
 * 
 * This test demonstrates fundamental K6 load testing capabilities:
 * - Multiple test stages (ramp-up, sustained load, ramp-down)
 * - Performance thresholds
 * - Custom metrics
 * - Response validation
 * - Realistic user behavior simulation
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomUser,
    PERFORMANCE_THRESHOLDS,
    randomSleep,
    thinkTime
} from '../../utils/helpers.js';

// Custom metrics
export const authSuccessRate = new Rate('auth_success_rate');
export const healthCheckDuration = new Trend('health_check_duration');
export const apiErrorRate = new Rate('api_error_rate');
export const businessTransactionCounter = new Counter('business_transactions');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp-up to 10 users over 2 minutes
    { duration: '5m', target: 10 },  // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 },  // Ramp-up to 20 users over 2 minutes
    { duration: '5m', target: 20 },  // Stay at 20 users for 5 minutes
    { duration: '2m', target: 0 },   // Ramp-down to 0 users over 2 minutes
  ],
  thresholds: {
    ...PERFORMANCE_THRESHOLDS,
    'health_check_duration': ['p(95)<500'], // Health checks should be very fast
    'business_transactions': ['count>100'], // Should complete at least 100 business transactions
  },
  tags: {
    test_type: 'load_test',
    environment: __ENV.ENV || 'dev',
  },
};

// Test data
let authToken = '';
const testUsers = [];

export function setup() {
  console.log('🚀 Starting Load Test Setup...');
  
  // Test API availability
  const healthResponse = http.get(`${API_BASE_URL}/health`, {
    headers: COMMON_HEADERS,
    tags: { name: 'health_check' }
  });
  
  console.log(`Health check status: ${healthResponse.status}`);
  
  if (healthResponse.status !== 200) {
    throw new Error('API is not available - health check failed');
  }

  // Create test users for the test
  for (let i = 0; i < 5; i++) {
    const userData = generateRandomUser();
    const registerResponse = http.post(
      `${API_BASE_URL}/auth/register`,
      JSON.stringify(userData),
      { 
        headers: COMMON_HEADERS,
        tags: { name: 'register_user' }
      }
    );
    
    if (registerResponse.status === 201) {
      const body = JSON.parse(registerResponse.body);
      testUsers.push({
        ...userData,
        token: body.access_token,
        userId: body.user.id
      });
    }
  }
  
  console.log(`✅ Setup completed. Created ${testUsers.length} test users.`);
  return { testUsers };
}

export default function (data) {
  const startTime = Date.now();
  
  // Step 1: Health Check (simulates monitoring/load balancer checks)
  const healthStartTime = Date.now();
  const healthResponse = http.get(`${API_BASE_URL}/health`, {
    headers: COMMON_HEADERS,
    tags: { name: 'health_check', api: 'health' }
  });
  
  const healthCheckTime = Date.now() - healthStartTime;
  healthCheckDuration.add(healthCheckTime);
  
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
    'health check has status field': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'ok';
    }
  });
  
  // Simulate user think time
  sleep(randomSleep(0.5, 1.5));
  
  // Step 2: User Authentication (random user from setup)
  if (data.testUsers && data.testUsers.length > 0) {
    const randomUser = data.testUsers[Math.floor(Math.random() * data.testUsers.length)];
    
    const loginResponse = http.post(
      `${API_BASE_URL}/auth/login`,
      JSON.stringify({
        username: randomUser.username,
        password: randomUser.password
      }),
      { 
        headers: COMMON_HEADERS,
        tags: { name: 'user_login', api: 'auth' }
      }
    );
    
    const authSuccess = check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 1000ms': (r) => r.timings.duration < 1000,
      'login response has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.access_token !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
    
    authSuccessRate.add(authSuccess);
    
    if (loginResponse.status === 200) {
      const body = JSON.parse(loginResponse.body);
      authToken = body.access_token;
    }
  }
  
  // Simulate user think time after login
  sleep(thinkTime());
  
  // Step 3: Browse Products (simulates typical user behavior)
  const productsResponse = http.get(`${API_BASE_URL}/products?page=1&limit=10`, {
    headers: COMMON_HEADERS,
    tags: { name: 'browse_products', api: 'products' }
  });
  
  check(productsResponse, {
    'products list status is 200': (r) => r.status === 200,
    'products response time < 2000ms': (r) => r.timings.duration < 2000,
    'products response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.products && Array.isArray(body.products);
      } catch (e) {
        return false;
      }
    }
  });
  
  // Random product interaction
  if (productsResponse.status === 200) {
    const body = JSON.parse(productsResponse.body);
    if (body.products && body.products.length > 0) {
      // Get details of a random product
      const randomProduct = body.products[Math.floor(Math.random() * body.products.length)];
      
      sleep(randomSleep(1, 2));
      
      const productDetailResponse = http.get(`${API_BASE_URL}/products/${randomProduct.id}`, {
        headers: COMMON_HEADERS,
        tags: { name: 'product_detail', api: 'products' }
      });
      
      check(productDetailResponse, {
        'product detail status is 200': (r) => r.status === 200,
        'product detail response time < 1500ms': (r) => r.timings.duration < 1500,
      });
    }
  }
  
  // Step 4: User Profile Access (if authenticated)
  if (authToken) {
    sleep(randomSleep(0.5, 1));
    
    const profileResponse = http.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        ...COMMON_HEADERS,
        'Authorization': `Bearer ${authToken}`
      },
      tags: { name: 'user_profile', api: 'auth' }
    });
    
    check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }
  
  // Step 5: Search functionality
  const searchQueries = ['laptop', 'smartphone', 'widget', 'gadget', 'device'];
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  sleep(randomSleep(1, 2));
  
  const searchResponse = http.get(`${API_BASE_URL}/products?search=${randomQuery}&page=1&limit=5`, {
    headers: COMMON_HEADERS,
    tags: { name: 'search_products', api: 'products' }
  });
  
  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  // Step 6: Category browsing
  const categories = ['Electronics', 'Books', 'Clothing', 'Home & Kitchen', 'Sports'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  sleep(randomSleep(0.5, 1.5));
  
  const categoryResponse = http.get(`${API_BASE_URL}/products?category=${randomCategory}&page=1&limit=10`, {
    headers: COMMON_HEADERS,
    tags: { name: 'browse_category', api: 'products' }
  });
  
  check(categoryResponse, {
    'category browse status is 200': (r) => r.status === 200,
    'category response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  // Calculate business transaction time
  const totalTime = Date.now() - startTime;
  businessTransactionCounter.add(1);
  
  // Track API errors
  const responses = [healthResponse, productsResponse, searchResponse, categoryResponse];
  const errorCount = responses.filter(r => r.status >= 400).length;
  apiErrorRate.add(errorCount / responses.length);
  
  // Final user think time before next iteration
  sleep(thinkTime());
}

export function teardown(data) {
  console.log('🧹 Load Test Teardown...');
  console.log(`Test completed with ${data.testUsers ? data.testUsers.length : 0} test users`);
}

export function handleSummary(data) {
  console.log('📊 Load Test Summary:');
  console.log(`- Total requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`- Failed requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`- Average response time: ${data.metrics.http_req_duration.values.avg}ms`);
  console.log(`- 95th percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  
  return {
    'stdout': '\n✅ Load Test Completed Successfully!\n',
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}
