/**
 * Mixed Workload Scenario Test
 * 
 * This test demonstrates K6's advanced scenario configuration capabilities:
 * - Multiple concurrent scenarios with different user behaviors
 * - Realistic mixed workload simulation
 * - Different execution patterns (constant VUs, ramping VUs, arrival rate)
 * - Scenario-specific metrics and thresholds
 * - Complex user journey simulation
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomProduct,
    generateRandomUser,
    getAuthHeaders,
    randomSleep,
    thinkTime
} from '../../utils/helpers.js';

// Scenario-specific metrics
export const apiUserSuccessRate = new Rate('api_user_success_rate');
export const webUserSuccessRate = new Rate('web_user_success_rate');
export const adminUserSuccessRate = new Rate('admin_user_success_rate');
export const businessTransactionTime = new Trend('business_transaction_time');
export const userJourneyCompletionRate = new Rate('user_journey_completion_rate');
export const scenarioErrors = new Counter('scenario_errors');

// Mixed workload scenario configuration
export const options = {
  scenarios: {
    // Scenario 1: API Users - Constant load
    api_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m',
      tags: { scenario: 'api_users', user_type: 'api' },
      exec: 'apiUserScenario',
    },
    
    // Scenario 2: Web Users - Ramping load
    web_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '6m', target: 15 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'web_users', user_type: 'web' },
      exec: 'webUserScenario',
    },
    
    // Scenario 3: Admin Users - Low frequency, high complexity
    admin_users: {
      executor: 'constant-arrival-rate',
      rate: 2, // 2 iterations per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 3,
      maxVUs: 5,
      tags: { scenario: 'admin_users', user_type: 'admin' },
      exec: 'adminUserScenario',
    },
    
    // Scenario 4: Background Load - System maintenance
    background_load: {
      executor: 'constant-vus',
      vus: 3,
      duration: '10m',
      tags: { scenario: 'background', user_type: 'system' },
      exec: 'backgroundLoadScenario',
    },
    
    // Scenario 5: Spike Traffic - Occasional traffic spikes
    spike_traffic: {
      executor: 'externally-controlled',
      vus: 0,
      maxVUs: 50,
      duration: '10m',
      tags: { scenario: 'spike_traffic', user_type: 'spike' },
      exec: 'spikeTrafficScenario',
    },
  },
  
  thresholds: {
    // Global thresholds
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.1'],
    
    // Scenario-specific thresholds
    'http_req_duration{scenario:api_users}': ['p(95)<1000'],
    'http_req_duration{scenario:web_users}': ['p(95)<1500'],
    'http_req_duration{scenario:admin_users}': ['p(95)<3000'],
    
    // Custom metric thresholds
    'api_user_success_rate': ['rate>0.98'],
    'web_user_success_rate': ['rate>0.95'],
    'admin_user_success_rate': ['rate>0.90'],
    'user_journey_completion_rate': ['rate>0.85'],
    'business_transaction_time': ['p(95)<10000'],
  },
  
  tags: {
    test_type: 'mixed_workload',
    environment: __ENV.ENV || 'dev',
  },
};

// Shared test data
let sharedTestData = {
  authTokens: new Map(),
  productIds: [],
  userIds: [],
  adminToken: '',
};

export function setup() {
  console.log('🎭 Starting Mixed Workload Scenario Test Setup...');
  
  // Create admin user for admin scenarios
  const adminData = {
    username: 'admin_user_mixed_test',
    email: 'admin@mixedtest.com',
    password: 'AdminPassword123!'
  };
  
  const adminRegResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(adminData),
    { headers: COMMON_HEADERS }
  );
  
  if (adminRegResponse.status === 201) {
    const body = JSON.parse(adminRegResponse.body);
    sharedTestData.adminToken = body.access_token;
  }
  
  // Get some existing products for testing
  const productsResponse = http.get(`${API_BASE_URL}/products?limit=20`);
  if (productsResponse.status === 200) {
    const body = JSON.parse(productsResponse.body);
    sharedTestData.productIds = body.products.map(p => p.id);
  }
  
  console.log('✅ Mixed workload test setup complete');
  return sharedTestData;
}

// Scenario 1: API Users - Fast, efficient API consumption
export function apiUserScenario(data) {
  const startTime = Date.now();
  let success = true;
  
  group('API User Journey', function () {
    // Step 1: Quick authentication
    const userData = generateRandomUser();
    const authResponse = http.post(
      `${API_BASE_URL}/auth/register`,
      JSON.stringify(userData),
      { 
        headers: COMMON_HEADERS,
        tags: { name: 'api_auth', scenario: 'api_users' }
      }
    );
    
    const authSuccess = check(authResponse, {
      'API auth successful': (r) => r.status === 201,
      'API auth fast': (r) => r.timings.duration < 800,
    });
    
    if (!authSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    let authToken = '';
    if (authResponse.status === 201) {
      const body = JSON.parse(authResponse.body);
      authToken = body.access_token;
    }
    
    // Step 2: Rapid data retrieval
    const requests = [
      http.get(`${API_BASE_URL}/products?limit=50`, {
        headers: COMMON_HEADERS,
        tags: { name: 'api_products', scenario: 'api_users' }
      }),
      http.get(`${API_BASE_URL}/products/categories`, {
        headers: COMMON_HEADERS,
        tags: { name: 'api_categories', scenario: 'api_users' }
      }),
    ];
    
    if (authToken) {
      requests.push(
        http.get(`${API_BASE_URL}/auth/profile`, {
          headers: getAuthHeaders(authToken),
          tags: { name: 'api_profile', scenario: 'api_users' }
        })
      );
    }
    
    const apiSuccess = requests.every(r => r.status === 200);
    if (!apiSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    // Step 3: Quick data manipulation (if authenticated)
    if (authToken && data.productIds.length > 0) {
      const randomProductId = data.productIds[Math.floor(Math.random() * data.productIds.length)];
      
      const productResponse = http.get(`${API_BASE_URL}/products/${randomProductId}`, {
        headers: COMMON_HEADERS,
        tags: { name: 'api_product_detail', scenario: 'api_users' }
      });
      
      if (productResponse.status !== 200) {
        success = false;
        scenarioErrors.add(1);
      }
    }
    
    // Minimal sleep for API users
    sleep(randomSleep(0.1, 0.5));
  });
  
  const totalTime = Date.now() - startTime;
  businessTransactionTime.add(totalTime);
  apiUserSuccessRate.add(success);
  userJourneyCompletionRate.add(success);
}

// Scenario 2: Web Users - Realistic browsing behavior
export function webUserScenario(data) {
  const startTime = Date.now();
  let success = true;
  
  group('Web User Journey', function () {
    // Step 1: Landing page simulation
    const healthResponse = http.get(`${API_BASE_URL}/health`, {
      headers: COMMON_HEADERS,
      tags: { name: 'web_landing', scenario: 'web_users' }
    });
    
    check(healthResponse, {
      'Landing page loads': (r) => r.status === 200,
    });
    
    sleep(thinkTime()); // User reads the page
    
    // Step 2: Browse products
    const browseResponse = http.get(`${API_BASE_URL}/products?page=1&limit=12`, {
      headers: COMMON_HEADERS,
      tags: { name: 'web_browse', scenario: 'web_users' }
    });
    
    const browseSuccess = check(browseResponse, {
      'Product browse successful': (r) => r.status === 200,
      'Products displayed': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.products && body.products.length > 0;
        } catch (e) {
          return false;
        }
      }
    });
    
    if (!browseSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    sleep(thinkTime()); // User browses products
    
    // Step 3: Search functionality
    const searchQueries = ['laptop', 'smartphone', 'coffee', 'book'];
    const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    
    const searchResponse = http.get(`${API_BASE_URL}/products?search=${randomQuery}&limit=10`, {
      headers: COMMON_HEADERS,
      tags: { name: 'web_search', scenario: 'web_users' }
    });
    
    const searchSuccess = check(searchResponse, {
      'Search successful': (r) => r.status === 200,
    });
    
    if (!searchSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    sleep(thinkTime()); // User reviews search results
    
    // Step 4: Product detail view
    if (data.productIds.length > 0) {
      const randomProductId = data.productIds[Math.floor(Math.random() * data.productIds.length)];
      
      const detailResponse = http.get(`${API_BASE_URL}/products/${randomProductId}`, {
        headers: COMMON_HEADERS,
        tags: { name: 'web_product_detail', scenario: 'web_users' }
      });
      
      const detailSuccess = check(detailResponse, {
        'Product detail loads': (r) => r.status === 200,
        'Product has required fields': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.name && body.price !== undefined;
          } catch (e) {
            return false;
          }
        }
      });
      
      if (!detailSuccess) {
        success = false;
        scenarioErrors.add(1);
      }
      
      sleep(thinkTime()); // User reads product details
    }
    
    // Step 5: Optional user registration (30% chance)
    if (Math.random() < 0.3) {
      const userData = generateRandomUser();
      
      const registerResponse = http.post(
        `${API_BASE_URL}/auth/register`,
        JSON.stringify(userData),
        { 
          headers: COMMON_HEADERS,
          tags: { name: 'web_register', scenario: 'web_users' }
        }
      );
      
      const regSuccess = check(registerResponse, {
        'Web registration successful': (r) => r.status === 201 || r.status === 400, // 400 if user exists
      });
      
      if (!regSuccess) {
        success = false;
        scenarioErrors.add(1);
      }
      
      sleep(randomSleep(1, 2)); // User fills form
    }
  });
  
  const totalTime = Date.now() - startTime;
  businessTransactionTime.add(totalTime);
  webUserSuccessRate.add(success);
  userJourneyCompletionRate.add(success);
}

// Scenario 3: Admin Users - Complex administrative tasks
export function adminUserScenario(data) {
  const startTime = Date.now();
  let success = true;
  
  if (!data.adminToken) {
    scenarioErrors.add(1);
    adminUserSuccessRate.add(false);
    return;
  }
  
  group('Admin User Journey', function () {
    const authHeaders = getAuthHeaders(data.adminToken);
    
    // Step 1: Admin dashboard - Get system overview
    const requests = [
      http.get(`${API_BASE_URL}/users?page=1&limit=50`, {
        headers: authHeaders,
        tags: { name: 'admin_users_list', scenario: 'admin_users' }
      }),
      http.get(`${API_BASE_URL}/products?page=1&limit=100`, {
        headers: authHeaders,
        tags: { name: 'admin_products_list', scenario: 'admin_users' }
      }),
      http.get(`${API_BASE_URL}/health`, {
        headers: authHeaders,
        tags: { name: 'admin_health_check', scenario: 'admin_users' }
      }),
    ];
    
    const dashboardSuccess = requests.every(r => r.status === 200);
    if (!dashboardSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    sleep(randomSleep(2, 4)); // Admin reviews data
    
    // Step 2: Product management
    const productData = generateRandomProduct();
    const createResponse = http.post(
      `${API_BASE_URL}/products`,
      JSON.stringify(productData),
      { 
        headers: authHeaders,
        tags: { name: 'admin_create_product', scenario: 'admin_users' }
      }
    );
    
    const createSuccess = check(createResponse, {
      'Product creation successful': (r) => r.status === 201,
      'Created product has ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch (e) {
          return false;
        }
      }
    });
    
    if (!createSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    let createdProductId = '';
    if (createResponse.status === 201) {
      const body = JSON.parse(createResponse.body);
      createdProductId = body.id;
    }
    
    sleep(randomSleep(1, 2)); // Admin processes
    
    // Step 3: Update created product
    if (createdProductId) {
      const updateData = { price: productData.price * 0.9 }; // 10% discount
      
      const updateResponse = http.patch(
        `${API_BASE_URL}/products/${createdProductId}`,
        JSON.stringify(updateData),
        { 
          headers: authHeaders,
          tags: { name: 'admin_update_product', scenario: 'admin_users' }
        }
      );
      
      const updateSuccess = check(updateResponse, {
        'Product update successful': (r) => r.status === 200,
        'Price updated correctly': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Math.abs(body.price - updateData.price) < 0.01;
          } catch (e) {
            return false;
          }
        }
      });
      
      if (!updateSuccess) {
        success = false;
        scenarioErrors.add(1);
      }
      
      sleep(randomSleep(1, 2));
    }
    
    // Step 4: User management
    const usersResponse = http.get(`${API_BASE_URL}/users?search=test&limit=10`, {
      headers: authHeaders,
      tags: { name: 'admin_search_users', scenario: 'admin_users' }
    });
    
    const userManagementSuccess = check(usersResponse, {
      'User search successful': (r) => r.status === 200,
    });
    
    if (!userManagementSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    // Step 5: System monitoring
    const monitoringRequests = [
      http.get(`${API_BASE_URL}/health/memory-intensive`, {
        headers: authHeaders,
        tags: { name: 'admin_memory_check', scenario: 'admin_users' }
      }),
      http.get(`${API_BASE_URL}/simulation/cpu-intensive?iterations=50000`, {
        headers: authHeaders,
        tags: { name: 'admin_cpu_check', scenario: 'admin_users' }
      }),
    ];
    
    const monitoringSuccess = monitoringRequests.every(r => r.status === 200);
    if (!monitoringSuccess) {
      success = false;
      scenarioErrors.add(1);
    }
    
    sleep(randomSleep(2, 5)); // Admin analyzes results
  });
  
  const totalTime = Date.now() - startTime;
  businessTransactionTime.add(totalTime);
  adminUserSuccessRate.add(success);
  userJourneyCompletionRate.add(success);
}

// Scenario 4: Background Load - System maintenance and monitoring
export function backgroundLoadScenario(data) {
  group('Background System Load', function () {
    // Health checks
    const healthResponse = http.get(`${API_BASE_URL}/health`, {
      headers: COMMON_HEADERS,
      tags: { name: 'background_health', scenario: 'background' }
    });
    
    check(healthResponse, {
      'Background health check': (r) => r.status === 200,
    });
    
    sleep(randomSleep(3, 7)); // Longer intervals for background tasks
    
    // Random data fetching
    const dataResponse = http.get(`${API_BASE_URL}/products?page=${Math.floor(Math.random() * 5) + 1}&limit=5`, {
      headers: COMMON_HEADERS,
      tags: { name: 'background_data', scenario: 'background' }
    });
    
    check(dataResponse, {
      'Background data fetch': (r) => r.status === 200,
    });
    
    sleep(randomSleep(5, 10)); // Long background intervals
  });
}

// Scenario 5: Spike Traffic - Sudden load increases
export function spikeTrafficScenario(data) {
  group('Spike Traffic Load', function () {
    // Rapid requests to simulate traffic spike
    const requests = [];
    
    for (let i = 0; i < 3; i++) {
      requests.push(
        http.get(`${API_BASE_URL}/products?page=${i + 1}&limit=20`, {
          headers: COMMON_HEADERS,
          tags: { name: 'spike_products', scenario: 'spike_traffic' }
        })
      );
      
      sleep(0.1); // Very rapid requests
    }
    
    const spikeSuccess = requests.every(r => r.status === 200 || r.status === 429); // Allow rate limiting
    
    check({ spikeSuccess }, {
      'Spike traffic handled': () => spikeSuccess,
    });
    
    // Brief pause before next spike
    sleep(randomSleep(0.5, 1.5));
  });
}

export function teardown(data) {
  console.log('🧹 Mixed Workload Scenario Test Teardown...');
  console.log(`Admin token used: ${data.adminToken ? 'Yes' : 'No'}`);
  console.log(`Product IDs available: ${data.productIds.length}`);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📊 Mixed Workload Scenario Test Summary:');
  console.log(`- API User Success Rate: ${(metrics.api_user_success_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Web User Success Rate: ${(metrics.web_user_success_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Admin User Success Rate: ${(metrics.admin_user_success_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Overall Journey Completion Rate: ${(metrics.user_journey_completion_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Average Business Transaction Time: ${metrics.business_transaction_time?.values?.avg || 'N/A'}ms`);
  console.log(`- Total Scenario Errors: ${metrics.scenario_errors?.values?.count || 0}`);
  
  const scenarioAnalysis = {
    apiUserPerformance: {
      successRate: metrics.api_user_success_rate?.values?.rate,
      avgResponseTime: extractScenarioMetric(data, 'api_users', 'http_req_duration'),
    },
    webUserPerformance: {
      successRate: metrics.web_user_success_rate?.values?.rate,
      avgResponseTime: extractScenarioMetric(data, 'web_users', 'http_req_duration'),
    },
    adminUserPerformance: {
      successRate: metrics.admin_user_success_rate?.values?.rate,
      avgResponseTime: extractScenarioMetric(data, 'admin_users', 'http_req_duration'),
    },
    overallMetrics: {
      journeyCompletionRate: metrics.user_journey_completion_rate?.values?.rate,
      avgBusinessTransactionTime: metrics.business_transaction_time?.values?.avg,
      totalErrors: metrics.scenario_errors?.values?.count,
    },
    workloadDistribution: analyzeWorkloadDistribution(data),
    recommendations: generateMixedWorkloadRecommendations(metrics),
  };
  
  return {
    'stdout': '\n🎭 Mixed Workload Scenario Test Completed!\n',
    'mixed-workload-results.json': JSON.stringify(data, null, 2),
    'scenario-analysis.json': JSON.stringify(scenarioAnalysis, null, 2),
  };
}

function extractScenarioMetric(data, scenario, metric) {
  // This would extract scenario-specific metrics from the data
  // Implementation depends on K6's data structure
  return 'N/A'; // Placeholder
}

function analyzeWorkloadDistribution(data) {
  return {
    totalRequests: data.metrics?.http_reqs?.values?.count || 0,
    requestDistribution: {
      apiUsers: '~40%',
      webUsers: '~35%',
      adminUsers: '~15%',
      backgroundLoad: '~7%',
      spikeTraffic: '~3%',
    },
    scenarioEfficiency: 'Analysis would compare expected vs actual distribution',
  };
}

function generateMixedWorkloadRecommendations(metrics) {
  const recommendations = [];
  
  const apiSuccess = metrics.api_user_success_rate?.values?.rate || 0;
  const webSuccess = metrics.web_user_success_rate?.values?.rate || 0;
  const adminSuccess = metrics.admin_user_success_rate?.values?.rate || 0;
  const journeyCompletion = metrics.user_journey_completion_rate?.values?.rate || 0;
  
  if (apiSuccess < 0.98) {
    recommendations.push('Optimize API endpoints for better reliability - API user success rate below 98%');
  }
  
  if (webSuccess < 0.95) {
    recommendations.push('Improve web user experience - web user success rate below 95%');
  }
  
  if (adminSuccess < 0.90) {
    recommendations.push('Review admin functionality performance - admin success rate below 90%');
  }
  
  if (journeyCompletion < 0.85) {
    recommendations.push('Investigate user journey failures - completion rate below 85%');
  }
  
  recommendations.push('Implement scenario-specific monitoring and alerting');
  recommendations.push('Consider load balancing strategies for different user types');
  recommendations.push('Optimize database queries for admin-heavy operations');
  recommendations.push('Add caching layers for frequently accessed data');
  
  return recommendations;
}
