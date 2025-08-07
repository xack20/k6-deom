// Base URL configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
export const API_BASE_URL = `${BASE_URL}/api/v1`;

// Common headers
export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'K6-Performance-Test/1.0.0',
};

// Authentication helpers
export function getAuthHeaders(token) {
  return {
    ...COMMON_HEADERS,
    'Authorization': `Bearer ${token}`,
  };
}

// Environment configuration
export const ENV_CONFIG = {
  dev: {
    baseUrl: 'http://localhost:3000',
    users: 10,
    duration: '30s',
  },
  staging: {
    baseUrl: 'https://staging-api.example.com',
    users: 50,
    duration: '5m',
  },
  prod: {
    baseUrl: 'https://api.example.com',
    users: 100,
    duration: '10m',
  },
};

// Get current environment config
export function getEnvConfig() {
  const env = __ENV.ENV || 'dev';
  return ENV_CONFIG[env] || ENV_CONFIG.dev;
}

// Common test data generators
export function generateRandomUser() {
  const timestamp = Date.now();
  return {
    username: `user_${timestamp}_${Math.floor(Math.random() * 1000)}`,
    email: `user_${timestamp}@example.com`,
    password: 'TestPassword123!',
  };
}

export function generateRandomProduct() {
  const categories = ['Electronics', 'Books', 'Clothing', 'Home & Kitchen', 'Sports'];
  const names = ['Widget', 'Gadget', 'Tool', 'Device', 'Accessory'];
  
  const timestamp = Date.now();
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return {
    name: `${randomName} ${timestamp}`,
    description: `Test product created at ${timestamp}`,
    price: Math.round((Math.random() * 1000 + 10) * 100) / 100,
    category: randomCategory,
    stock: Math.floor(Math.random() * 100) + 1,
  };
}

// Response validation helpers
export function validateResponse(response, expectedStatus = 200) {
  return {
    'status is correct': response.status === expectedStatus,
    'response time is acceptable': response.timings.duration < 2000,
    'response has body': response.body && response.body.length > 0,
  };
}

export function validateAuthResponse(response) {
  const body = JSON.parse(response.body);
  return {
    ...validateResponse(response),
    'has access token': body.access_token !== undefined,
    'has user info': body.user !== undefined,
  };
}

export function validatePaginatedResponse(response) {
  const body = JSON.parse(response.body);
  return {
    ...validateResponse(response),
    'has data array': Array.isArray(body.data) || Array.isArray(body.users) || Array.isArray(body.products),
    'has pagination info': body.total !== undefined && body.page !== undefined,
  };
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // Response time thresholds
  'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
  'http_req_duration{api:auth}': ['p(95)<1000'], // Auth should be faster
  'http_req_duration{api:health}': ['p(95)<500'], // Health checks should be very fast
  
  // Success rate thresholds
  'http_req_failed': ['rate<0.1'], // Error rate should be less than 10%
  'http_req_failed{api:auth}': ['rate<0.05'], // Auth errors should be less than 5%
  
  // Throughput thresholds
  'http_reqs': ['rate>10'], // Should handle at least 10 req/s
  
  // Custom business metrics
  'auth_success_rate': ['rate>0.95'], // 95% auth success rate
  'api_availability': ['rate>0.99'], // 99% API availability
};

// Custom metrics
import { Counter, Rate, Trend } from 'k6/metrics';

export const authSuccessRate = new Rate('auth_success_rate');
export const apiAvailability = new Rate('api_availability');
export const businessTransactionDuration = new Trend('business_transaction_duration');
export const errorCounter = new Counter('custom_errors');

// Sleep patterns for realistic user behavior
export function randomSleep(min = 1, max = 3) {
  const sleepTime = Math.random() * (max - min) + min;
  return sleepTime;
}

export function thinkTime() {
  // Simulate user think time (1-5 seconds)
  return randomSleep(1, 5);
}

// Data helpers
export function getRandomArrayItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateTestData(count = 100) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: i + 1,
      user: generateRandomUser(),
      product: generateRandomProduct(),
    });
  }
  return data;
}
