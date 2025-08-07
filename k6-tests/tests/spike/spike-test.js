/**
 * Spike Test
 * 
 * This test simulates sudden traffic spikes to test system resilience:
 * - Rapid user increase (traffic spikes)
 * - System behavior under sudden load
 * - Auto-scaling response testing
 * - Circuit breaker and rate limiting validation
 * - Recovery after spike events
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomUser,
    randomSleep
} from '../../utils/helpers.js';

// Custom metrics for spike testing
export const spikeResponseTime = new Trend('spike_response_time');
export const spikeErrorRate = new Rate('spike_error_rate');
export const systemOverloadIndicator = new Rate('system_overload_indicator');
export const rateLimitHitRate = new Rate('rate_limit_hit_rate');
export const circuitBreakerTriggered = new Counter('circuit_breaker_triggered');
export const autoScalingResponse = new Trend('auto_scaling_response_time');

// Spike test configuration - multiple spike patterns
export const options = {
  stages: [
    // Baseline load
    { duration: '2m', target: 10 },
    
    // First spike - moderate
    { duration: '30s', target: 100 },  // Sudden jump to 100 users
    { duration: '1m', target: 100 },   // Maintain spike
    { duration: '30s', target: 10 },   // Return to baseline
    
    // Recovery period
    { duration: '2m', target: 10 },
    
    // Second spike - severe
    { duration: '15s', target: 300 },  // Very sudden, very high spike
    { duration: '1m', target: 300 },   // Maintain severe spike
    { duration: '30s', target: 10 },   // Quick return to baseline
    
    // Recovery period
    { duration: '2m', target: 10 },
    
    // Third spike - extreme
    { duration: '10s', target: 500 },  // Extreme spike
    { duration: '30s', target: 500 },  // Brief extreme load
    { duration: '20s', target: 10 },   // Quick recovery
    
    // Final recovery
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<10000'], // Allow high response times during spikes
    'http_req_failed': ['rate<0.4'],      // Allow higher error rates during spikes
    'spike_error_rate': ['rate<0.6'],     // Spike-specific error tolerance
    'rate_limit_hit_rate': ['rate<0.8'],  // Expect rate limiting during spikes
  },
  tags: {
    test_type: 'spike_test',
    environment: __ENV.ENV || 'dev',
  },
};

// Track spike events
let spikeEvents = [];
let currentSpikePhase = 'baseline';

export function setup() {
  console.log('⚡ Starting Spike Test Setup...');
  
  // Verify baseline system health
  const healthResponse = http.get(`${API_BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('System is not healthy - cannot start spike test');
  }
  
  console.log('✅ System baseline established, ready for spike testing...');
  return { 
    startTime: Date.now(),
    spikeEvents: []
  };
}

export default function (data) {
  const currentVUs = __VU;
  const phase = determineSpikePhase(currentVUs);
  
  if (phase !== currentSpikePhase) {
    console.log(`📊 Spike phase transition: ${currentSpikePhase} -> ${phase} (VUs: ${currentVUs})`);
    currentSpikePhase = phase;
    
    if (phase.includes('spike')) {
      spikeEvents.push({
        phase,
        startTime: Date.now(),
        userCount: currentVUs
      });
    }
  }
  
  const startTime = Date.now();
  
  // Test 1: Health check during spike
  const healthResponse = http.get(`${API_BASE_URL}/health`, {
    headers: COMMON_HEADERS,
    tags: { 
      name: 'health_during_spike', 
      spike_phase: phase,
      user_count: currentVUs.toString()
    }
  });
  
  const healthResponseTime = healthResponse.timings.duration;
  spikeResponseTime.add(healthResponseTime);
  
  const healthCheck = check(healthResponse, {
    'health endpoint responds': (r) => r.status !== 0,
    'health not completely down': (r) => r.status !== 502 && r.status !== 503,
  });
  
  // Check for rate limiting
  if (healthResponse.status === 429) {
    rateLimitHitRate.add(1);
    console.log(`⚠️  Rate limiting triggered at ${currentVUs} users`);
  } else {
    rateLimitHitRate.add(0);
  }
  
  // Check for system overload indicators
  if (healthResponse.status >= 500 || healthResponseTime > 5000) {
    systemOverloadIndicator.add(1);
  } else {
    systemOverloadIndicator.add(0);
  }
  
  // Test 2: Authentication under spike
  const userData = generateRandomUser();
  const authResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(userData),
    { 
      headers: COMMON_HEADERS,
      tags: { 
        name: 'auth_during_spike', 
        spike_phase: phase,
        user_count: currentVUs.toString()
      }
    }
  );
  
  const authCheck = check(authResponse, {
    'auth endpoint responds': (r) => r.status !== 0,
    'auth handles spike load': (r) => r.status === 201 || r.status === 400 || r.status === 429 || r.status === 503,
  });
  
  if (authResponse.status === 429) {
    rateLimitHitRate.add(1);
  }
  
  // Test 3: High-frequency API calls during spike
  let rapidCallsSuccessful = 0;
  let rapidCallsTotal = 0;
  
  for (let i = 0; i < 5; i++) {
    rapidCallsTotal++;
    
    const rapidResponse = http.get(`${API_BASE_URL}/products?page=${i + 1}&limit=5`, {
      headers: COMMON_HEADERS,
      tags: { 
        name: 'rapid_calls_during_spike', 
        spike_phase: phase,
        call_index: i.toString()
      }
    });
    
    if (rapidResponse.status === 200) {
      rapidCallsSuccessful++;
    } else if (rapidResponse.status === 429) {
      rateLimitHitRate.add(1);
    }
    
    spikeResponseTime.add(rapidResponse.timings.duration);
    
    // Very short sleep to maintain high frequency
    sleep(0.1);
  }
  
  // Test 4: Resource-intensive operations during spike
  if (phase.includes('spike')) {
    const intensiveResponse = http.get(`${API_BASE_URL}/simulation/cpu-intensive?iterations=500000`, {
      headers: COMMON_HEADERS,
      tags: { 
        name: 'intensive_during_spike', 
        spike_phase: phase
      }
    });
    
    check(intensiveResponse, {
      'intensive operation responds': (r) => r.status !== 0,
      'intensive operation handles spike': (r) => r.status === 200 || r.status >= 500,
    });
    
    if (intensiveResponse.status >= 500) {
      systemOverloadIndicator.add(1);
    }
  }
  
  // Test 5: Memory-intensive operations during extreme spikes
  if (phase === 'extreme_spike' && currentVUs > 400) {
    const memoryResponse = http.get(`${API_BASE_URL}/health/memory-intensive`, {
      headers: COMMON_HEADERS,
      tags: { 
        name: 'memory_during_extreme_spike', 
        spike_phase: phase
      }
    });
    
    if (memoryResponse.status >= 500 || memoryResponse.timings.duration > 10000) {
      circuitBreakerTriggered.add(1);
      console.log(`🔥 Circuit breaker likely triggered at ${currentVUs} users`);
    }
  }
  
  // Test 6: Error endpoint behavior during spike
  const errorResponse = http.get(`${API_BASE_URL}/health/error`, {
    headers: COMMON_HEADERS,
    tags: { 
      name: 'error_handling_during_spike', 
      spike_phase: phase
    }
  });
  
  check(errorResponse, {
    'error endpoint responds during spike': (r) => r.status !== 0,
    'error handling works during spike': (r) => r.status === 200 || r.status === 500 || r.status === 503,
  });
  
  // Calculate spike-specific error rate
  const allResponses = [healthResponse, authResponse, errorResponse];
  const spikeErrors = allResponses.filter(r => r.status >= 400 && r.status !== 429).length;
  spikeErrorRate.add(spikeErrors / allResponses.length);
  
  // Adaptive sleep based on spike phase
  let sleepTime;
  switch (phase) {
    case 'extreme_spike':
      sleepTime = randomSleep(0.05, 0.1); // Very aggressive during extreme spike
      break;
    case 'severe_spike':
      sleepTime = randomSleep(0.1, 0.2);  // Aggressive during severe spike
      break;
    case 'moderate_spike':
      sleepTime = randomSleep(0.2, 0.5);  // Moderate during moderate spike
      break;
    default:
      sleepTime = randomSleep(0.5, 1.5);  // Normal during baseline
  }
  
  sleep(sleepTime);
}

function determineSpikePhase(currentVUs) {
  if (currentVUs >= 400) return 'extreme_spike';
  if (currentVUs >= 200) return 'severe_spike';
  if (currentVUs >= 80) return 'moderate_spike';
  if (currentVUs >= 20) return 'recovery';
  return 'baseline';
}

export function teardown(data) {
  console.log('🧹 Spike Test Teardown...');
  
  // Check system recovery after spikes
  sleep(5); // Wait a moment for system to stabilize
  
  const recoveryHealthResponse = http.get(`${API_BASE_URL}/health`);
  const systemRecovered = recoveryHealthResponse.status === 200 && 
                          recoveryHealthResponse.timings.duration < 1000;
  
  console.log(`System recovery after spikes: ${systemRecovered ? '✅ Recovered' : '❌ Still degraded'}`);
  
  if (data.startTime) {
    const totalTestTime = Date.now() - data.startTime;
    console.log(`Total spike test duration: ${totalTestTime}ms`);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📊 Spike Test Summary:');
  console.log(`- Average spike response time: ${metrics.spike_response_time?.values?.avg || 'N/A'}ms`);
  console.log(`- Max spike response time: ${metrics.spike_response_time?.values?.max || 'N/A'}ms`);
  console.log(`- Spike error rate: ${(metrics.spike_error_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Rate limit hit rate: ${(metrics.rate_limit_hit_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- System overload incidents: ${(metrics.system_overload_indicator?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Circuit breaker triggers: ${metrics.circuit_breaker_triggered?.values?.count || 0}`);
  
  const spikeAnalysis = {
    averageSpikeResponseTime: metrics.spike_response_time?.values?.avg,
    maxSpikeResponseTime: metrics.spike_response_time?.values?.max,
    spikeErrorRate: metrics.spike_error_rate?.values?.rate,
    rateLimitEffectiveness: metrics.rate_limit_hit_rate?.values?.rate,
    systemOverloadFrequency: metrics.system_overload_indicator?.values?.rate,
    circuitBreakerActivations: metrics.circuit_breaker_triggered?.values?.count,
    spikeHandlingAssessment: assessSpikeHandling(metrics),
    recommendations: generateSpikeRecommendations(metrics),
  };
  
  return {
    'stdout': '\n⚡ Spike Test Completed!\n',
    'spike-test-results.json': JSON.stringify(data, null, 2),
    'spike-analysis.json': JSON.stringify(spikeAnalysis, null, 2),
  };
}

function assessSpikeHandling(metrics) {
  const errorRate = metrics.spike_error_rate?.values?.rate || 0;
  const overloadRate = metrics.system_overload_indicator?.values?.rate || 0;
  const rateLimitRate = metrics.rate_limit_hit_rate?.values?.rate || 0;
  
  if (errorRate < 0.2 && overloadRate < 0.3) {
    return 'Excellent - System handled spikes very well';
  } else if (errorRate < 0.4 && rateLimitRate > 0.3) {
    return 'Good - Rate limiting effectively protected the system';
  } else if (overloadRate > 0.7) {
    return 'Poor - System frequently overloaded during spikes';
  } else {
    return 'Fair - Some degradation during spikes but system remained functional';
  }
}

function generateSpikeRecommendations(metrics) {
  const recommendations = [];
  const errorRate = metrics.spike_error_rate?.values?.rate || 0;
  const overloadRate = metrics.system_overload_indicator?.values?.rate || 0;
  const rateLimitRate = metrics.rate_limit_hit_rate?.values?.rate || 0;
  
  if (errorRate > 0.3) {
    recommendations.push('Implement more aggressive rate limiting and circuit breakers');
  }
  
  if (overloadRate > 0.5) {
    recommendations.push('Consider auto-scaling solutions for sudden traffic spikes');
  }
  
  if (rateLimitRate < 0.1 && errorRate > 0.2) {
    recommendations.push('Rate limiting may be too lenient - consider tightening limits');
  }
  
  if (metrics.circuit_breaker_triggered?.values?.count > 5) {
    recommendations.push('Review circuit breaker thresholds - may be too sensitive');
  }
  
  recommendations.push('Implement queue-based processing for spike traffic');
  recommendations.push('Add CDN and caching layers to absorb traffic spikes');
  recommendations.push('Consider implementing graceful degradation for non-critical features');
  
  return recommendations;
}
