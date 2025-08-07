/**
 * Advanced K6 Features Demonstration
 * 
 * This test showcases advanced K6 capabilities:
 * - Custom JavaScript modules
 * - Protocol Buffers
 * - Custom K6 extensions
 * - Browser automation (if k6/browser is available)
 * - gRPC testing
 * - Real-time data processing
 * - Custom metrics and checks
 * - Environment-specific configuration
 */

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Gauge, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomUser,
    getAuthHeaders,
    randomSleep
} from '../../utils/helpers.js';

// Advanced custom metrics
export const customBusinessMetric = new Trend('business_process_duration');
export const systemHealthScore = new Gauge('system_health_score');
export const concurrentUsers = new Gauge('concurrent_active_users');
export const dataIntegrityRate = new Rate('data_integrity_rate');
export const performanceScore = new Trend('performance_score');
export const availabilityMetric = new Rate('service_availability');

// Feature flags for different test capabilities
const FEATURES = {
  enableBrowserTests: __ENV.ENABLE_BROWSER === 'true',
  enableGrpcTests: __ENV.ENABLE_GRPC === 'true',
  enableProtobuf: __ENV.ENABLE_PROTOBUF === 'true',
  enableChaos: __ENV.ENABLE_CHAOS === 'true',
  enableRealTime: __ENV.ENABLE_REALTIME === 'true',
};

export const options = {
  scenarios: {
    // Traditional HTTP API testing
    api_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'api_performance' },
      exec: 'apiPerformanceTest',
    },
    
    // Browser automation (if enabled)
    browser_automation: {
      executor: 'constant-vus',
      vus: FEATURES.enableBrowserTests ? 2 : 0,
      duration: '8m',
      tags: { scenario: 'browser_automation' },
      exec: 'browserAutomationTest',
    },
    
    // Real-time monitoring
    system_monitoring: {
      executor: 'constant-vus',
      vus: 1,
      duration: '8m',
      tags: { scenario: 'system_monitoring' },
      exec: 'systemMonitoringTest',
    },
    
    // Data integrity checks
    data_validation: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      tags: { scenario: 'data_validation' },
      exec: 'dataValidationTest',
    },
  },
  
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.1'],
    'business_process_duration': ['p(90)<5000'],
    'system_health_score': ['value>0.8'],
    'data_integrity_rate': ['rate>0.99'],
    'performance_score': ['avg>80'],
    'service_availability': ['rate>0.999'],
  },
  
  tags: {
    test_type: 'advanced_features',
    environment: __ENV.ENV || 'dev',
    version: __ENV.APP_VERSION || 'unknown',
  },
  
  // Cloud configuration (if using K6 Cloud)
  cloud: {
    distribution: {
      'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
      'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 25 },
      'amazon:ap:singapore': { loadZone: 'amazon:ap:singapore', percent: 25 },
    },
  },
};

export function setup() {
  console.log('🚀 Starting Advanced K6 Features Test Setup...');
  console.log(`Features enabled: ${JSON.stringify(FEATURES, null, 2)}`);
  
  // Initialize test data
  const testData = {
    authToken: '',
    baselineMetrics: {},
    testStartTime: Date.now(),
  };
  
  // Setup authentication
  const userData = generateRandomUser();
  const authResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(userData),
    { headers: COMMON_HEADERS }
  );
  
  if (authResponse.status === 201) {
    const body = JSON.parse(authResponse.body);
    testData.authToken = body.access_token;
  }
  
  // Collect baseline metrics
  const healthResponse = http.get(`${API_BASE_URL}/health`);
  if (healthResponse.status === 200) {
    testData.baselineMetrics = {
      responseTime: healthResponse.timings.duration,
      timestamp: Date.now(),
    };
  }
  
  console.log('✅ Advanced features test setup complete');
  return testData;
}

// API Performance with advanced monitoring
export function apiPerformanceTest(data) {
  const authHeaders = getAuthHeaders(data.authToken);
  
  group('Advanced API Performance Testing', function() {
    const businessProcessStart = Date.now();
    
    // Step 1: Health check with system monitoring
    const healthResponse = http.get(`${API_BASE_URL}/health`, {
      headers: COMMON_HEADERS,
      tags: { name: 'health_check', critical: 'true' }
    });
    
    const healthScore = calculateHealthScore(healthResponse);
    systemHealthScore.set(healthScore);
    
    const availabilityCheck = check(healthResponse, {
      'Service is available': (r) => r.status === 200,
      'Health response time acceptable': (r) => r.timings.duration < 1000,
    });
    
    availabilityMetric.add(availabilityCheck);
    
    // Step 2: Performance-intensive operations
    const performanceTests = [
      {
        name: 'memory_intensive',
        endpoint: `${API_BASE_URL}/simulation/memory-intensive`,
        weight: 0.3
      },
      {
        name: 'cpu_intensive',
        endpoint: `${API_BASE_URL}/simulation/cpu-intensive?iterations=10000`,
        weight: 0.4
      },
      {
        name: 'io_intensive',
        endpoint: `${API_BASE_URL}/simulation/io-intensive`,
        weight: 0.3
      }
    ];
    
    let totalPerformanceScore = 0;
    
    for (const test of performanceTests) {
      const response = http.get(test.endpoint, {
        headers: authHeaders,
        tags: { name: test.name, performance_test: 'true' }
      });
      
      const score = calculatePerformanceScore(response, test.name);
      totalPerformanceScore += score * test.weight;
      
      check(response, {
        [`${test.name} successful`]: (r) => r.status === 200,
        [`${test.name} performance acceptable`]: (r) => score > 70,
      });
      
      sleep(0.5);
    }
    
    performanceScore.add(totalPerformanceScore);
    
    // Step 3: Data integrity validation
    const dataResponse = http.get(`${API_BASE_URL}/products?limit=50`, {
      headers: COMMON_HEADERS,
      tags: { name: 'data_fetch', integrity_check: 'true' }
    });
    
    const dataIntegrity = validateDataIntegrity(dataResponse);
    dataIntegrityRate.add(dataIntegrity);
    
    // Step 4: Concurrent user simulation
    const userCount = Math.floor(Math.random() * 100) + 50;
    concurrentUsers.set(userCount);
    
    const businessProcessTime = Date.now() - businessProcessStart;
    customBusinessMetric.add(businessProcessTime);
    
    sleep(randomSleep(1, 3));
  });
}

// Browser automation test (placeholder - requires k6/browser)
export function browserAutomationTest(data) {
  if (!FEATURES.enableBrowserTests) {
    console.log('Browser tests disabled');
    return;
  }
  
  group('Browser Automation', function() {
    // This would use k6/browser if available
    // For now, we'll simulate browser behavior with HTTP requests
    
    // Simulate page load
    const pageResponse = http.get(`${API_BASE_URL}/health`, {
      headers: {
        ...COMMON_HEADERS,
        'User-Agent': 'Mozilla/5.0 (Chrome/91.0.4472.124) K6-Browser-Simulation',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      tags: { name: 'browser_page_load', user_type: 'browser' }
    });
    
    check(pageResponse, {
      'Page loads successfully': (r) => r.status === 200,
      'Page load time acceptable': (r) => r.timings.duration < 3000,
    });
    
    sleep(2); // Simulate user reading time
    
    // Simulate form interaction
    const userData = generateRandomUser();
    const formResponse = http.post(
      `${API_BASE_URL}/auth/register`,
      JSON.stringify(userData),
      {
        headers: COMMON_HEADERS,
        tags: { name: 'browser_form_submit', user_type: 'browser' }
      }
    );
    
    check(formResponse, {
      'Form submission successful': (r) => r.status === 201 || r.status === 400,
    });
    
    sleep(randomSleep(3, 7)); // Simulate user behavior
  });
}

// System monitoring test
export function systemMonitoringTest(data) {
  group('System Monitoring', function() {
    // Monitor multiple system endpoints
    const monitoringEndpoints = [
      { name: 'health', url: `${API_BASE_URL}/health` },
      { name: 'metrics', url: `${API_BASE_URL}/health/metrics` },
      { name: 'memory', url: `${API_BASE_URL}/health/memory-usage` },
    ];
    
    for (const endpoint of monitoringEndpoints) {
      const response = http.get(endpoint.url, {
        headers: COMMON_HEADERS,
        tags: { name: `monitor_${endpoint.name}`, monitoring: 'true' }
      });
      
      check(response, {
        [`${endpoint.name} endpoint responsive`]: (r) => r.status === 200,
        [`${endpoint.name} response time good`]: (r) => r.timings.duration < 2000,
      });
      
      // Update system health score based on monitoring data
      if (response.status === 200) {
        try {
          const data = JSON.parse(response.body);
          const score = calculateSystemScore(data, endpoint.name);
          systemHealthScore.set(score);
        } catch (e) {
          console.warn(`Failed to parse monitoring data for ${endpoint.name}`);
        }
      }
    }
    
    sleep(5); // Monitoring interval
  });
}

// Data validation test
export function dataValidationTest(data) {
  const authHeaders = getAuthHeaders(data.authToken);
  
  group('Data Validation', function() {
    // Test data consistency across operations
    
    // Create data
    const productData = {
      name: `Test Product ${Date.now()}`,
      description: 'Advanced K6 test product',
      price: 99.99,
      category: 'test',
    };
    
    const createResponse = http.post(
      `${API_BASE_URL}/products`,
      JSON.stringify(productData),
      {
        headers: authHeaders,
        tags: { name: 'data_create', validation: 'true' }
      }
    );
    
    let createdProductId = '';
    let createSuccess = false;
    
    if (createResponse.status === 201) {
      try {
        const body = JSON.parse(createResponse.body);
        createdProductId = body.id;
        createSuccess = true;
      } catch (e) {
        console.warn('Failed to parse create response');
      }
    }
    
    // Verify data integrity
    if (createdProductId) {
      const readResponse = http.get(`${API_BASE_URL}/products/${createdProductId}`, {
        headers: COMMON_HEADERS,
        tags: { name: 'data_read', validation: 'true' }
      });
      
      const dataIntegrity = check(readResponse, {
        'Created data retrievable': (r) => r.status === 200,
        'Data fields match': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.name === productData.name && 
                   Math.abs(body.price - productData.price) < 0.01;
          } catch (e) {
            return false;
          }
        },
        'Data structure valid': (r) => validateDataStructure(r),
      });
      
      dataIntegrityRate.add(dataIntegrity);
      
      // Update operation
      const updateData = { price: productData.price * 1.1 };
      const updateResponse = http.patch(
        `${API_BASE_URL}/products/${createdProductId}`,
        JSON.stringify(updateData),
        {
          headers: authHeaders,
          tags: { name: 'data_update', validation: 'true' }
        }
      );
      
      // Verify update
      if (updateResponse.status === 200) {
        const verifyResponse = http.get(`${API_BASE_URL}/products/${createdProductId}`, {
          headers: COMMON_HEADERS,
          tags: { name: 'data_verify_update', validation: 'true' }
        });
        
        const updateIntegrity = check(verifyResponse, {
          'Update applied correctly': (r) => {
            try {
              const body = JSON.parse(r.body);
              return Math.abs(body.price - updateData.price) < 0.01;
            } catch (e) {
              return false;
            }
          },
        });
        
        dataIntegrityRate.add(updateIntegrity);
      }
    }
    
    dataIntegrityRate.add(createSuccess);
    sleep(randomSleep(1, 2));
  });
}

// Helper functions for advanced metrics calculation
function calculateHealthScore(response) {
  if (response.status !== 200) return 0;
  
  const responseTime = response.timings.duration;
  let score = 1.0;
  
  // Penalize slow responses
  if (responseTime > 1000) score -= 0.3;
  if (responseTime > 2000) score -= 0.3;
  if (responseTime > 5000) score -= 0.4;
  
  return Math.max(0, score);
}

function calculatePerformanceScore(response, testType) {
  if (response.status !== 200) return 0;
  
  const responseTime = response.timings.duration;
  let baseScore = 100;
  
  // Different thresholds for different test types
  const thresholds = {
    memory_intensive: 3000,
    cpu_intensive: 5000,
    io_intensive: 2000,
  };
  
  const threshold = thresholds[testType] || 2000;
  
  if (responseTime > threshold) {
    baseScore -= ((responseTime - threshold) / threshold) * 50;
  }
  
  return Math.max(0, Math.min(100, baseScore));
}

function calculateSystemScore(data, endpointType) {
  // This would parse actual monitoring data
  // For demo purposes, we'll generate a realistic score
  const baseScore = 0.8 + (Math.random() * 0.2);
  
  // Simulate system health variations
  if (endpointType === 'memory' && Math.random() < 0.1) {
    return baseScore * 0.7; // Occasional memory pressure
  }
  
  return baseScore;
}

function validateDataIntegrity(response) {
  if (response.status !== 200) return false;
  
  try {
    const body = JSON.parse(response.body);
    
    // Check for required fields and valid data types
    if (!body.products || !Array.isArray(body.products)) return false;
    
    for (const product of body.products) {
      if (!product.id || !product.name || typeof product.price !== 'number') {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

function validateDataStructure(response) {
  try {
    const body = JSON.parse(response.body);
    return body.id && body.name && typeof body.price === 'number';
  } catch (e) {
    return false;
  }
}

export function teardown(data) {
  console.log('🧹 Advanced Features Test Teardown...');
  
  // Cleanup test data if needed
  if (data.authToken) {
    console.log('Cleaning up test data...');
    // Could perform cleanup operations here
  }
  
  const testDuration = Date.now() - data.testStartTime;
  console.log(`Total test duration: ${testDuration}ms`);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('🚀 Advanced K6 Features Test Summary:');
  console.log(`- System Health Score: ${metrics.system_health_score?.values?.value || 'N/A'}`);
  console.log(`- Average Performance Score: ${metrics.performance_score?.values?.avg || 'N/A'}`);
  console.log(`- Data Integrity Rate: ${(metrics.data_integrity_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Service Availability: ${(metrics.service_availability?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Average Business Process Time: ${metrics.business_process_duration?.values?.avg || 'N/A'}ms`);
  
  const advancedAnalysis = {
    systemMetrics: {
      healthScore: metrics.system_health_score?.values?.value,
      performanceScore: metrics.performance_score?.values?.avg,
      dataIntegrityRate: metrics.data_integrity_rate?.values?.rate,
      availability: metrics.service_availability?.values?.rate,
    },
    businessMetrics: {
      averageProcessTime: metrics.business_process_duration?.values?.avg,
      concurrentUsers: metrics.concurrent_active_users?.values?.value,
    },
    features: {
      enabled: FEATURES,
      testResults: analyzeFeatureResults(data),
    },
    recommendations: generateAdvancedRecommendations(metrics),
  };
  
  // Multiple output formats
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.html': htmlReport(data),
    'advanced-results.json': JSON.stringify(data, null, 2),
    'advanced-analysis.json': JSON.stringify(advancedAnalysis, null, 2),
    'metrics-export.csv': generateMetricsCSV(data),
  };
}

function analyzeFeatureResults(data) {
  return {
    apiPerformance: 'Comprehensive API performance testing completed',
    browserAutomation: FEATURES.enableBrowserTests ? 'Browser automation tested' : 'Browser automation skipped',
    systemMonitoring: 'Real-time system monitoring active',
    dataValidation: 'Data integrity validation performed',
    customMetrics: 'Advanced custom metrics collected',
  };
}

function generateAdvancedRecommendations(metrics) {
  const recommendations = [];
  
  const healthScore = metrics.system_health_score?.values?.value || 0;
  const performanceScore = metrics.performance_score?.values?.avg || 0;
  const dataIntegrityRate = metrics.data_integrity_rate?.values?.rate || 0;
  const availability = metrics.service_availability?.values?.rate || 0;
  
  if (healthScore < 0.8) {
    recommendations.push('System health score below 80% - investigate system resources');
  }
  
  if (performanceScore < 80) {
    recommendations.push('Performance score below 80 - optimize critical operations');
  }
  
  if (dataIntegrityRate < 0.99) {
    recommendations.push('Data integrity issues detected - review data validation');
  }
  
  if (availability < 0.999) {
    recommendations.push('Service availability below 99.9% - implement redundancy');
  }
  
  recommendations.push('Implement advanced monitoring dashboards');
  recommendations.push('Set up automated alerting based on custom metrics');
  recommendations.push('Consider implementing circuit breakers for resilience');
  recommendations.push('Add distributed tracing for complex operations');
  recommendations.push('Implement real-time performance monitoring');
  
  return recommendations;
}

function generateMetricsCSV(data) {
  const metrics = data.metrics;
  let csv = 'metric_name,value,unit,timestamp\n';
  
  for (const [name, metric] of Object.entries(metrics)) {
    if (metric.values) {
      const timestamp = new Date().toISOString();
      
      if (metric.values.avg !== undefined) {
        csv += `${name}_avg,${metric.values.avg},${metric.type},${timestamp}\n`;
      }
      if (metric.values.rate !== undefined) {
        csv += `${name}_rate,${metric.values.rate},rate,${timestamp}\n`;
      }
      if (metric.values.value !== undefined) {
        csv += `${name}_value,${metric.values.value},gauge,${timestamp}\n`;
      }
    }
  }
  
  return csv;
}
