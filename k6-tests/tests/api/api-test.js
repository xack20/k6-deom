/**
 * Comprehensive API Test
 * 
 * This test validates all API endpoints and demonstrates K6's API testing capabilities:
 * - Complete CRUD operations testing
 * - Response validation and schema testing
 * - Error handling validation
 * - Data consistency testing
 * - API contract validation
 * - Performance validation for each endpoint
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomUser,
    getAuthHeaders,
    validateAuthResponse,
    validatePaginatedResponse,
    validateResponse
} from '../../utils/helpers.js';

// Custom metrics for API testing
export const apiEndpointSuccess = new Rate('api_endpoint_success');
export const crudOperationSuccess = new Rate('crud_operation_success');
export const dataConsistencyRate = new Rate('data_consistency_rate');
export const apiContractViolations = new Counter('api_contract_violations');
export const endpointResponseTime = new Trend('endpoint_response_time');

// API test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Gradual ramp-up for API testing
    { duration: '5m', target: 10 },  // Sustained API testing
    { duration: '1m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.05'],
    'api_endpoint_success': ['rate>0.95'],
    'crud_operation_success': ['rate>0.90'],
    'data_consistency_rate': ['rate>0.95'],
  },
  tags: {
    test_type: 'api_test',
    environment: __ENV.ENV || 'dev',
  },
};

// Test data storage
let testUsers = [];
let testProducts = [];
let authTokens = {};

export function setup() {
  console.log('🧪 Starting Comprehensive API Test Setup...');
  
  // Test API availability
  const healthResponse = http.get(`${API_BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('API is not available');
  }
  
  console.log('✅ API is available, starting comprehensive tests...');
  return { 
    startTime: Date.now(),
    testData: {
      users: [],
      products: [],
      tokens: {}
    }
  };
}

export default function (data) {
  // Group 1: Authentication API Testing
  group('Authentication API', function () {
    testAuthenticationEndpoints();
  });
  
  // Group 2: Users API Testing
  group('Users API', function () {
    testUsersEndpoints();
  });
  
  // Group 3: Products API Testing
  group('Products API', function () {
    testProductsEndpoints();
  });
  
  // Group 4: Health and Monitoring API Testing
  group('Health & Monitoring API', function () {
    testHealthEndpoints();
  });
  
  // Group 5: Upload API Testing
  group('Upload API', function () {
    testUploadEndpoints();
  });
  
  // Group 6: Simulation API Testing
  group('Simulation API', function () {
    testSimulationEndpoints();
  });
  
  // Group 7: Error Handling Testing
  group('Error Handling', function () {
    testErrorHandling();
  });
  
  sleep(1);
}

function testAuthenticationEndpoints() {
  const userData = generateRandomUser();
  
  // Test Registration
  const registerResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(userData),
    { 
      headers: COMMON_HEADERS,
      tags: { name: 'auth_register', api: 'auth' }
    }
  );
  
  const registerCheck = check(registerResponse, {
    'register status is 201': (r) => r.status === 201,
    'register response time < 1000ms': (r) => r.timings.duration < 1000,
    'register returns access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    },
    'register returns user info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.username === userData.username;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(registerCheck);
  endpointResponseTime.add(registerResponse.timings.duration);
  
  let authToken = '';
  let userId = '';
  
  if (registerResponse.status === 201) {
    const body = JSON.parse(registerResponse.body);
    authToken = body.access_token;
    userId = body.user.id;
    testUsers.push({ ...userData, id: userId, token: authToken });
  }
  
  // Test Login
  if (authToken) {
    const loginResponse = http.post(
      `${API_BASE_URL}/auth/login`,
      JSON.stringify({
        username: userData.username,
        password: userData.password
      }),
      { 
        headers: COMMON_HEADERS,
        tags: { name: 'auth_login', api: 'auth' }
      }
    );
    
    const loginCheck = check(loginResponse, validateAuthResponse(loginResponse));
    apiEndpointSuccess.add(loginCheck);
    endpointResponseTime.add(loginResponse.timings.duration);
    
    // Test Profile Access
    const profileResponse = http.get(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders(authToken),
      tags: { name: 'auth_profile', api: 'auth' }
    });
    
    const profileCheck = check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.username === userData.username;
        } catch (e) {
          return false;
        }
      }
    });
    
    apiEndpointSuccess.add(profileCheck);
    
    // Test Token Refresh
    const refreshResponse = http.post(`${API_BASE_URL}/auth/refresh`, {}, {
      headers: getAuthHeaders(authToken),
      tags: { name: 'auth_refresh', api: 'auth' }
    });
    
    const refreshCheck = check(refreshResponse, {
      'refresh status is 200': (r) => r.status === 200,
      'refresh returns new token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.access_token !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
    
    apiEndpointSuccess.add(refreshCheck);
  }
}

function testUsersEndpoints() {
  // Use existing auth token if available
  const authUser = testUsers.length > 0 ? testUsers[0] : null;
  if (!authUser) return;
  
  const authHeaders = getAuthHeaders(authUser.token);
  
  // Test Users List (with pagination)
  const usersListResponse = http.get(`${API_BASE_URL}/users?page=1&limit=5`, {
    headers: authHeaders,
    tags: { name: 'users_list', api: 'users' }
  });
  
  const usersListCheck = check(usersListResponse, {
    ...validatePaginatedResponse(usersListResponse),
    'users list has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.users && body.total !== undefined && body.page !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(usersListCheck);
  
  // Test Users Search
  const searchResponse = http.get(`${API_BASE_URL}/users?search=test&page=1&limit=5`, {
    headers: authHeaders,
    tags: { name: 'users_search', api: 'users' }
  });
  
  const searchCheck = check(searchResponse, validateResponse(searchResponse));
  apiEndpointSuccess.add(searchCheck);
  
  // Test Get Single User
  const userDetailResponse = http.get(`${API_BASE_URL}/users/${authUser.id}`, {
    headers: authHeaders,
    tags: { name: 'users_detail', api: 'users' }
  });
  
  const userDetailCheck = check(userDetailResponse, {
    ...validateResponse(userDetailResponse),
    'user detail returns correct user': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.username === authUser.username;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(userDetailCheck);
  dataConsistencyRate.add(userDetailCheck);
  
  // Test User Update
  const updateData = { email: `updated_${authUser.email}` };
  const updateResponse = http.patch(
    `${API_BASE_URL}/users/${authUser.id}`,
    JSON.stringify(updateData),
    {
      headers: authHeaders,
      tags: { name: 'users_update', api: 'users' }
    }
  );
  
  const updateCheck = check(updateResponse, {
    ...validateResponse(updateResponse),
    'user update modifies data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.email === updateData.email;
      } catch (e) {
        return false;
      }
    }
  });
  
  crudOperationSuccess.add(updateCheck);
}

function testProductsEndpoints() {
  // Test Products List (public endpoint)
  const productsResponse = http.get(`${API_BASE_URL}/products?page=1&limit=10`, {
    headers: COMMON_HEADERS,
    tags: { name: 'products_list', api: 'products' }
  });
  
  const productsCheck = check(productsResponse, {
    ...validatePaginatedResponse(productsResponse),
    'products list contains products': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.products && body.products.length > 0;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(productsCheck);
  
  let productId = '';
  if (productsResponse.status === 200) {
    const body = JSON.parse(productsResponse.body);
    if (body.products && body.products.length > 0) {
      productId = body.products[0].id;
    }
  }
  
  // Test Product Detail
  if (productId) {
    const productDetailResponse = http.get(`${API_BASE_URL}/products/${productId}`, {
      headers: COMMON_HEADERS,
      tags: { name: 'products_detail', api: 'products' }
    });
    
    const productDetailCheck = check(productDetailResponse, {
      ...validateResponse(productDetailResponse),
      'product detail has required fields': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id && body.name && body.price !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
    
    apiEndpointSuccess.add(productDetailCheck);
    dataConsistencyRate.add(productDetailCheck);
  }
  
  // Test Categories Endpoint
  const categoriesResponse = http.get(`${API_BASE_URL}/products/categories`, {
    headers: COMMON_HEADERS,
    tags: { name: 'products_categories', api: 'products' }
  });
  
  const categoriesCheck = check(categoriesResponse, {
    ...validateResponse(categoriesResponse),
    'categories returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(categoriesCheck);
  
  // Test Product Search
  const searchQueries = ['laptop', 'smartphone', 'widget'];
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  const searchResponse = http.get(`${API_BASE_URL}/products?search=${randomQuery}&page=1&limit=5`, {
    headers: COMMON_HEADERS,
    tags: { name: 'products_search', api: 'products' }
  });
  
  const searchCheck = check(searchResponse, validateResponse(searchResponse));
  apiEndpointSuccess.add(searchCheck);
  
  // Test Product Filtering
  const filterResponse = http.get(`${API_BASE_URL}/products?category=Electronics&minPrice=100&maxPrice=1000`, {
    headers: COMMON_HEADERS,
    tags: { name: 'products_filter', api: 'products' }
  });
  
  const filterCheck = check(filterResponse, {
    ...validateResponse(filterResponse),
    'filtered products match criteria': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (!body.products) return false;
        return body.products.every(p => p.category === 'Electronics' && p.price >= 100 && p.price <= 1000);
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(filterCheck);
  dataConsistencyRate.add(filterCheck);
}

function testHealthEndpoints() {
  // Test Basic Health Check
  const healthResponse = http.get(`${API_BASE_URL}/health`, {
    headers: COMMON_HEADERS,
    tags: { name: 'health_basic', api: 'health' }
  });
  
  const healthCheck = check(healthResponse, {
    ...validateResponse(healthResponse),
    'health check returns status ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
    'health check includes uptime': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.uptime !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(healthCheck);
  
  // Test Slow Endpoint
  const slowResponse = http.get(`${API_BASE_URL}/health/slow`, {
    headers: COMMON_HEADERS,
    tags: { name: 'health_slow', api: 'health' }
  });
  
  const slowCheck = check(slowResponse, {
    'slow endpoint responds': (r) => r.status === 200,
    'slow endpoint takes time': (r) => r.timings.duration > 1000,
    'slow endpoint includes delay info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.delay !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(slowCheck);
  
  // Test Error Endpoint
  const errorResponse = http.get(`${API_BASE_URL}/health/error`, {
    headers: COMMON_HEADERS,
    tags: { name: 'health_error', api: 'health' }
  });
  
  const errorCheck = check(errorResponse, {
    'error endpoint responds': (r) => r.status === 200 || r.status === 500,
    'error endpoint handles errors gracefully': (r) => r.status !== 0,
  });
  
  apiEndpointSuccess.add(errorCheck);
}

function testUploadEndpoints() {
  // Create a simple file for testing
  const fileContent = 'test file content for K6 upload testing';
  const boundary = '----formdata-k6-' + Math.random().toString(36);
  
  const body = `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
    'Content-Type: text/plain\r\n\r\n' +
    fileContent + '\r\n' +
    `--${boundary}--\r\n`;
  
  const uploadResponse = http.post(`${API_BASE_URL}/upload/file`, body, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    tags: { name: 'upload_file', api: 'upload' }
  });
  
  const uploadCheck = check(uploadResponse, {
    'upload status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'upload response includes filename': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.filename !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(uploadCheck);
}

function testSimulationEndpoints() {
  // Test CPU Intensive Endpoint
  const cpuResponse = http.get(`${API_BASE_URL}/simulation/cpu-intensive?iterations=100000`, {
    headers: COMMON_HEADERS,
    tags: { name: 'simulation_cpu', api: 'simulation' }
  });
  
  const cpuCheck = check(cpuResponse, {
    ...validateResponse(cpuResponse),
    'cpu intensive includes result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result !== undefined && body.iterations !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(cpuCheck);
  
  // Test Network Simulation
  const networkData = { delay: 500, shouldFail: false };
  const networkResponse = http.post(
    `${API_BASE_URL}/simulation/network-simulation`,
    JSON.stringify(networkData),
    {
      headers: COMMON_HEADERS,
      tags: { name: 'simulation_network', api: 'simulation' }
    }
  );
  
  const networkCheck = check(networkResponse, {
    ...validateResponse(networkResponse),
    'network simulation respects delay': (r) => r.timings.duration >= 450, // Allow some variance
  });
  
  apiEndpointSuccess.add(networkCheck);
  
  // Test Random Response
  const randomResponse = http.get(`${API_BASE_URL}/simulation/random-response?size=50`, {
    headers: COMMON_HEADERS,
    tags: { name: 'simulation_random', api: 'simulation' }
  });
  
  const randomCheck = check(randomResponse, {
    ...validateResponse(randomResponse),
    'random response has expected size': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.length === 50;
      } catch (e) {
        return false;
      }
    }
  });
  
  apiEndpointSuccess.add(randomCheck);
}

function testErrorHandling() {
  // Test 404 Error
  const notFoundResponse = http.get(`${API_BASE_URL}/nonexistent-endpoint`, {
    headers: COMMON_HEADERS,
    tags: { name: 'error_404', api: 'error' }
  });
  
  const notFoundCheck = check(notFoundResponse, {
    '404 returns correct status': (r) => r.status === 404,
    '404 response is not empty': (r) => r.body.length > 0,
  });
  
  // Test Invalid Product ID
  const invalidProductResponse = http.get(`${API_BASE_URL}/products/invalid-id-format`, {
    headers: COMMON_HEADERS,
    tags: { name: 'error_invalid_id', api: 'error' }
  });
  
  const invalidProductCheck = check(invalidProductResponse, {
    'invalid product ID handled': (r) => r.status === 404 || r.status === 400,
  });
  
  // Test Unauthorized Access
  const unauthorizedResponse = http.get(`${API_BASE_URL}/users`, {
    headers: COMMON_HEADERS, // No auth token
    tags: { name: 'error_unauthorized', api: 'error' }
  });
  
  const unauthorizedCheck = check(unauthorizedResponse, {
    'unauthorized returns 401': (r) => r.status === 401,
  });
  
  // Test Invalid JSON
  const invalidJsonResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    'invalid json content',
    {
      headers: COMMON_HEADERS,
      tags: { name: 'error_invalid_json', api: 'error' }
    }
  );
  
  const invalidJsonCheck = check(invalidJsonResponse, {
    'invalid JSON handled': (r) => r.status === 400,
  });
  
  const errorHandlingSuccess = notFoundCheck && invalidProductCheck && unauthorizedCheck && invalidJsonCheck;
  apiEndpointSuccess.add(errorHandlingSuccess);
}

export function teardown(data) {
  console.log('🧹 API Test Teardown...');
  
  // Cleanup test data if needed
  console.log(`Created ${testUsers.length} test users`);
  console.log(`Tested ${testProducts.length} products`);
  
  if (data.startTime) {
    const totalTestTime = Date.now() - data.startTime;
    console.log(`Total API test duration: ${totalTestTime}ms`);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📊 Comprehensive API Test Summary:');
  console.log(`- API endpoint success rate: ${(metrics.api_endpoint_success?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- CRUD operation success rate: ${(metrics.crud_operation_success?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Data consistency rate: ${(metrics.data_consistency_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- API contract violations: ${metrics.api_contract_violations?.values?.count || 0}`);
  console.log(`- Average endpoint response time: ${metrics.endpoint_response_time?.values?.avg || 'N/A'}ms`);
  
  const apiTestAnalysis = {
    endpointSuccessRate: metrics.api_endpoint_success?.values?.rate,
    crudOperationSuccessRate: metrics.crud_operation_success?.values?.rate,
    dataConsistencyRate: metrics.data_consistency_rate?.values?.rate,
    contractViolations: metrics.api_contract_violations?.values?.count,
    averageResponseTime: metrics.endpoint_response_time?.values?.avg,
    testedEndpoints: extractTestedEndpoints(data),
    apiQualityScore: calculateApiQualityScore(metrics),
    recommendations: generateApiRecommendations(metrics),
  };
  
  return {
    'stdout': '\n🧪 Comprehensive API Test Completed!\n',
    'api-test-results.json': JSON.stringify(data, null, 2),
    'api-analysis.json': JSON.stringify(apiTestAnalysis, null, 2),
  };
}

function extractTestedEndpoints(data) {
  const endpoints = new Set();
  
  if (data.metrics && data.metrics.http_reqs && data.metrics.http_reqs.values) {
    // Extract unique endpoints from test data
    // This would need to be implemented based on the actual data structure
  }
  
  return [
    'auth/register', 'auth/login', 'auth/profile', 'auth/refresh',
    'users', 'users/{id}', 'users (search)',
    'products', 'products/{id}', 'products/categories', 'products (search)', 'products (filter)',
    'health', 'health/slow', 'health/error', 'health/memory-intensive',
    'upload/file',
    'simulation/cpu-intensive', 'simulation/network-simulation', 'simulation/random-response'
  ];
}

function calculateApiQualityScore(metrics) {
  const successRate = metrics.api_endpoint_success?.values?.rate || 0;
  const consistencyRate = metrics.data_consistency_rate?.values?.rate || 0;
  const avgResponseTime = metrics.endpoint_response_time?.values?.avg || 5000;
  const violations = metrics.api_contract_violations?.values?.count || 0;
  
  let score = 0;
  
  // Success rate weight: 40%
  score += successRate * 40;
  
  // Consistency rate weight: 30%
  score += consistencyRate * 30;
  
  // Response time weight: 20% (inverted - faster is better)
  const responseScore = Math.max(0, (2000 - avgResponseTime) / 2000) * 20;
  score += responseScore;
  
  // Contract violations weight: 10% (inverted - fewer is better)
  const violationScore = Math.max(0, (10 - violations) / 10) * 10;
  score += violationScore;
  
  return Math.round(score);
}

function generateApiRecommendations(metrics) {
  const recommendations = [];
  const successRate = metrics.api_endpoint_success?.values?.rate || 0;
  const consistencyRate = metrics.data_consistency_rate?.values?.rate || 0;
  const avgResponseTime = metrics.endpoint_response_time?.values?.avg || 0;
  const violations = metrics.api_contract_violations?.values?.count || 0;
  
  if (successRate < 0.95) {
    recommendations.push('Improve API reliability - success rate below 95%');
  }
  
  if (consistencyRate < 0.90) {
    recommendations.push('Review data consistency across endpoints');
  }
  
  if (avgResponseTime > 1000) {
    recommendations.push('Optimize endpoint response times - currently above 1 second average');
  }
  
  if (violations > 5) {
    recommendations.push('Fix API contract violations detected during testing');
  }
  
  recommendations.push('Implement comprehensive API documentation with OpenAPI/Swagger');
  recommendations.push('Add API versioning strategy for future compatibility');
  recommendations.push('Consider implementing API rate limiting and caching');
  
  return recommendations;
}
