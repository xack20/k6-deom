/**
 * Stress Test
 * 
 * This test pushes the system beyond normal operating capacity to find breaking points:
 * - Gradual increase to high load levels
 * - Sustained high load to identify resource exhaustion
 * - System recovery testing
 * - Error rate monitoring under stress
 * - Performance degradation analysis
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Gauge, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomProduct,
    generateRandomUser,
    randomSleep
} from '../../utils/helpers.js';

// Custom metrics for stress testing
export const systemStressLevel = new Gauge('system_stress_level');
export const errorRateUnderStress = new Rate('error_rate_under_stress');
export const responseTimeUnderStress = new Trend('response_time_under_stress');
export const resourceExhaustionIndicator = new Rate('resource_exhaustion_indicator');
export const systemRecoveryTime = new Trend('system_recovery_time');

// Stress test configuration
export const options = {
  stages: [
    // Initial ramp-up
    { duration: '2m', target: 50 },   // Ramp to normal load
    { duration: '5m', target: 50 },   // Maintain normal load
    
    // Stress phase 1 - Moderate stress
    { duration: '2m', target: 100 },  // Double the load
    { duration: '5m', target: 100 },  // Sustain moderate stress
    
    // Stress phase 2 - High stress
    { duration: '2m', target: 200 },  // Quadruple the load
    { duration: '5m', target: 200 },  // Sustain high stress
    
    // Stress phase 3 - Maximum stress
    { duration: '2m', target: 300 },  // Maximum stress
    { duration: '3m', target: 300 },  // Brief maximum stress
    
    // Recovery testing
    { duration: '2m', target: 100 },  // Drop to moderate load
    { duration: '3m', target: 50 },   // Return to normal
    { duration: '2m', target: 0 },    // Complete shutdown
  ],
  thresholds: {
    // More lenient thresholds for stress testing
    'http_req_duration': ['p(95)<5000'], // Allow higher response times
    'http_req_failed': ['rate<0.3'],     // Allow higher error rates under stress
    'error_rate_under_stress': ['rate<0.5'], // Monitor stress-specific errors
    'system_stress_level': ['value<100'], // Custom stress level monitoring
  },
  tags: {
    test_type: 'stress_test',
    environment: __ENV.ENV || 'dev',
  },
};

// Global variables for tracking system state
let consecutiveErrors = 0;
let systemOverloaded = false;
let recoveryStartTime = 0;

export function setup() {
  console.log('💪 Starting Stress Test Setup...');
  
  // Verify system is healthy before stress testing
  const healthResponse = http.get(`${API_BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('System is not healthy - cannot start stress test');
  }
  
  console.log('✅ System is healthy, beginning stress test...');
  return { startTime: Date.now() };
}

export default function (data) {
  const currentVUs = __VU;
  const currentStage = getCurrentStage();
  
  // Calculate stress level (0-100 based on current VUs)
  const stressLevel = Math.min((currentVUs / 300) * 100, 100);
  systemStressLevel.add(stressLevel);
  
  const startTime = Date.now();
  
  // Test 1: Health check under stress
  const healthResponse = http.get(`${API_BASE_URL}/health`, {
    headers: COMMON_HEADERS,
    tags: { name: 'health_under_stress', stress_level: stressLevel.toString() }
  });
  
  const healthCheck = check(healthResponse, {
    'health check responds': (r) => r.status !== 0,
    'health check not timing out': (r) => r.timings.duration < 10000,
  });
  
  if (!healthCheck) {
    consecutiveErrors++;
    if (consecutiveErrors > 5 && !systemOverloaded) {
      systemOverloaded = true;
      recoveryStartTime = Date.now();
      console.log(`⚠️  System overload detected at stress level ${stressLevel}%`);
    }
  } else if (systemOverloaded && healthCheck) {
    // System is recovering
    const recoveryTime = Date.now() - recoveryStartTime;
    systemRecoveryTime.add(recoveryTime);
    systemOverloaded = false;
    consecutiveErrors = 0;
    console.log(`✅ System recovered after ${recoveryTime}ms`);
  }
  
  // Test 2: Authentication under stress
  const userData = generateRandomUser();
  const registerResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(userData),
    { 
      headers: COMMON_HEADERS,
      tags: { name: 'register_under_stress', stress_level: stressLevel.toString() }
    }
  );
  
  const authSuccess = check(registerResponse, {
    'registration responds': (r) => r.status !== 0,
    'registration succeeds or fails gracefully': (r) => r.status === 201 || r.status === 400 || r.status === 429,
  });
  
  let authToken = '';
  if (registerResponse.status === 201) {
    const body = JSON.parse(registerResponse.body);
    authToken = body.access_token;
  }
  
  // Test 3: Product operations under stress
  const productData = generateRandomProduct();
  
  // Create product (if authenticated)
  if (authToken) {
    const createResponse = http.post(
      `${API_BASE_URL}/products`,
      JSON.stringify(productData),
      { 
        headers: {
          ...COMMON_HEADERS,
          'Authorization': `Bearer ${authToken}`
        },
        tags: { name: 'create_product_under_stress', stress_level: stressLevel.toString() }
      }
    );
    
    check(createResponse, {
      'product creation responds': (r) => r.status !== 0,
      'product creation handles load': (r) => r.status < 500 || r.status === 503, // Accept service unavailable
    });
  }
  
  // Test 4: High-frequency product browsing
  for (let i = 0; i < 3; i++) {
    const browseResponse = http.get(`${API_BASE_URL}/products?page=${i + 1}&limit=20`, {
      headers: COMMON_HEADERS,
      tags: { name: 'rapid_browsing', stress_level: stressLevel.toString() }
    });
    
    const browseCheck = check(browseResponse, {
      'browse responds': (r) => r.status !== 0,
      'browse handles high frequency': (r) => r.status === 200 || r.status === 429 || r.status === 503,
    });
    
    if (!browseCheck) {
      consecutiveErrors++;
    }
    
    responseTimeUnderStress.add(browseResponse.timings.duration);
    
    // Very short sleep to maintain high frequency
    sleep(randomSleep(0.1, 0.3));
  }
  
  // Test 5: Memory-intensive operations under stress
  if (stressLevel > 70) {
    const memoryResponse = http.get(`${API_BASE_URL}/health/memory-intensive`, {
      headers: COMMON_HEADERS,
      tags: { name: 'memory_intensive_under_stress', stress_level: stressLevel.toString() }
    });
    
    const memoryCheck = check(memoryResponse, {
      'memory operation responds': (r) => r.status !== 0,
      'memory operation completes or fails gracefully': (r) => r.status === 200 || r.status >= 500,
    });
    
    // Indicator of resource exhaustion
    if (memoryResponse.status === 500 || memoryResponse.status === 503) {
      resourceExhaustionIndicator.add(1);
    } else {
      resourceExhaustionIndicator.add(0);
    }
  }
  
  // Test 6: Error simulation under stress
  const errorResponse = http.get(`${API_BASE_URL}/health/error`, {
    headers: COMMON_HEADERS,
    tags: { name: 'error_handling_under_stress', stress_level: stressLevel.toString() }
  });
  
  check(errorResponse, {
    'error endpoint responds': (r) => r.status !== 0,
    'error handling works under stress': (r) => r.status === 200 || r.status === 500,
  });
  
  // Calculate error rates
  const totalRequests = 6; // Number of requests made in this iteration
  const errorCount = [healthResponse, registerResponse, errorResponse].filter(r => r.status >= 400).length;
  errorRateUnderStress.add(errorCount / totalRequests);
  
  // Adaptive sleep based on stress level
  const sleepTime = Math.max(0.1, 2 - (stressLevel / 100) * 1.5);
  sleep(sleepTime);
}

function getCurrentStage() {
  const elapsed = __ENV.K6_CURRENT_STAGE_TIME || 0;
  const stages = [
    { duration: 120, target: 50, name: 'ramp_up' },
    { duration: 300, target: 50, name: 'normal_load' },
    { duration: 120, target: 100, name: 'moderate_stress' },
    { duration: 300, target: 100, name: 'sustain_moderate' },
    { duration: 120, target: 200, name: 'high_stress' },
    { duration: 300, target: 200, name: 'sustain_high' },
    { duration: 120, target: 300, name: 'maximum_stress' },
    { duration: 180, target: 300, name: 'sustain_maximum' },
    { duration: 120, target: 100, name: 'recovery_1' },
    { duration: 180, target: 50, name: 'recovery_2' },
    { duration: 120, target: 0, name: 'shutdown' },
  ];
  
  let totalTime = 0;
  for (const stage of stages) {
    totalTime += stage.duration;
    if (elapsed <= totalTime) {
      return stage.name;
    }
  }
  return 'unknown';
}

export function teardown(data) {
  console.log('🧹 Stress Test Teardown...');
  
  // Final health check to see if system recovered
  const finalHealthResponse = http.get(`${API_BASE_URL}/health`);
  const systemRecovered = finalHealthResponse.status === 200;
  
  console.log(`System recovery status: ${systemRecovered ? '✅ Recovered' : '❌ Still degraded'}`);
  
  if (data.startTime) {
    const totalTestTime = Date.now() - data.startTime;
    console.log(`Total stress test duration: ${totalTestTime}ms`);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📊 Stress Test Summary:');
  console.log(`- Peak stress level: ${metrics.system_stress_level?.values?.max || 'N/A'}%`);
  console.log(`- Error rate under stress: ${(metrics.error_rate_under_stress?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Resource exhaustion incidents: ${metrics.resource_exhaustion_indicator?.values?.rate || 'N/A'}`);
  console.log(`- Average response time under stress: ${metrics.response_time_under_stress?.values?.avg || 'N/A'}ms`);
  console.log(`- System recovery time: ${metrics.system_recovery_time?.values?.avg || 'N/A'}ms`);
  
  const stressAnalysis = {
    peakStressLevel: metrics.system_stress_level?.values?.max,
    errorRateUnderStress: metrics.error_rate_under_stress?.values?.rate,
    resourceExhaustion: metrics.resource_exhaustion_indicator?.values?.rate,
    averageRecoveryTime: metrics.system_recovery_time?.values?.avg,
    systemBreakingPoint: identifyBreakingPoint(data),
    recommendations: generateRecommendations(data),
  };
  
  return {
    'stdout': '\n💪 Stress Test Completed!\n',
    'stress-test-results.json': JSON.stringify(data, null, 2),
    'stress-analysis.json': JSON.stringify(stressAnalysis, null, 2),
  };
}

function identifyBreakingPoint(data) {
  // Analyze metrics to identify the breaking point
  const errorRate = data.metrics.error_rate_under_stress?.values?.rate || 0;
  const avgResponseTime = data.metrics.response_time_under_stress?.values?.avg || 0;
  
  if (errorRate > 0.5) {
    return 'System reached breaking point - error rate exceeded 50%';
  } else if (avgResponseTime > 10000) {
    return 'System reached breaking point - response times exceeded 10 seconds';
  } else {
    return 'System handled stress well - no clear breaking point identified';
  }
}

function generateRecommendations(data) {
  const recommendations = [];
  const errorRate = data.metrics.error_rate_under_stress?.values?.rate || 0;
  const avgResponseTime = data.metrics.response_time_under_stress?.values?.avg || 0;
  const resourceExhaustion = data.metrics.resource_exhaustion_indicator?.values?.rate || 0;
  
  if (errorRate > 0.3) {
    recommendations.push('Consider implementing circuit breakers and graceful degradation');
  }
  
  if (avgResponseTime > 5000) {
    recommendations.push('Optimize slow endpoints and consider caching strategies');
  }
  
  if (resourceExhaustion > 0.2) {
    recommendations.push('Review memory usage and implement resource limits');
  }
  
  recommendations.push('Implement horizontal scaling for handling peak loads');
  recommendations.push('Add monitoring and alerting for stress indicators');
  
  return recommendations;
}
