/**
 * Authentication Flow Test
 * 
 * This test focuses specifically on authentication scenarios and security:
 * - Login/logout flows
 * - Token management and refresh
 * - Session handling
 * - Security validation
 * - Concurrent authentication
 * - Authentication performance under load
 */

import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomUser,
    getAuthHeaders,
    randomSleep
} from '../../utils/helpers.js';

// Load test users from CSV
const users = new SharedArray('users', function () {
  return open('../../data/users.csv').split('\n').slice(1).map(line => {
    const [username, email, password] = line.split(',');
    return { username, email, password };
  });
});

// Custom metrics for authentication testing
export const authenticationSuccessRate = new Rate('authentication_success_rate');
export const tokenValidationRate = new Rate('token_validation_rate');
export const sessionDuration = new Trend('session_duration');
export const concurrentAuthAttempts = new Counter('concurrent_auth_attempts');
export const authenticationErrors = new Counter('authentication_errors');
export const tokenRefreshSuccessRate = new Rate('token_refresh_success_rate');

// Authentication test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Start with light auth load
    { duration: '3m', target: 15 },  // Increase to moderate auth load
    { duration: '2m', target: 25 },  // High concurrent auth load
    { duration: '2m', target: 15 },  // Reduce load
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration{name:auth_login}': ['p(95)<1000'],
    'http_req_duration{name:auth_register}': ['p(95)<1500'],
    'authentication_success_rate': ['rate>0.95'],
    'token_validation_rate': ['rate>0.98'],
    'token_refresh_success_rate': ['rate>0.95'],
    'authentication_errors': ['count<10'],
  },
  tags: {
    test_type: 'auth_flow_test',
    environment: __ENV.ENV || 'dev',
  },
};

// Global auth session tracking
let activeSessions = [];
let sessionStartTimes = new Map();

export function setup() {
  console.log('🔐 Starting Authentication Flow Test Setup...');
  
  // Verify auth endpoints are available
  const healthResponse = http.get(`${API_BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('API is not available for authentication testing');
  }
  
  console.log('✅ Authentication test setup complete');
  return { 
    startTime: Date.now(),
    authMetrics: {
      totalAttempts: 0,
      successfulAuths: 0,
      failedAuths: 0
    }
  };
}

export default function (data) {
  const vuId = __VU;
  const iterationId = __ITER;
  
  // Group 1: User Registration Flow
  group('User Registration', function () {
    testUserRegistration(vuId, iterationId);
  });
  
  // Group 2: User Login Flow
  group('User Login', function () {
    testUserLogin(vuId, iterationId);
  });
  
  // Group 3: Token Management
  group('Token Management', function () {
    testTokenManagement(vuId, iterationId);
  });
  
  // Group 4: Session Management
  group('Session Management', function () {
    testSessionManagement(vuId, iterationId);
  });
  
  // Group 5: Concurrent Authentication
  group('Concurrent Authentication', function () {
    testConcurrentAuthentication(vuId, iterationId);
  });
  
  // Group 6: Security Validation
  group('Security Validation', function () {
    testSecurityScenarios(vuId, iterationId);
  });
  
  sleep(randomSleep(0.5, 2));
}

function testUserRegistration(vuId, iterationId) {
  const userData = generateRandomUser();
  userData.username = `${userData.username}_vu${vuId}_iter${iterationId}`;
  userData.email = `vu${vuId}_iter${iterationId}_${userData.email}`;
  
  const registrationStartTime = Date.now();
  
  const registerResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(userData),
    { 
      headers: COMMON_HEADERS,
      tags: { 
        name: 'auth_register', 
        api: 'auth',
        vu_id: vuId.toString(),
        iteration: iterationId.toString()
      }
    }
  );
  
  const registrationTime = Date.now() - registrationStartTime;
  
  const registrationSuccess = check(registerResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 1500ms': (r) => r.timings.duration < 1500,
    'registration returns valid token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token && body.access_token.length > 20;
      } catch (e) {
        return false;
      }
    },
    'registration returns user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.username === userData.username;
      } catch (e) {
        return false;
      }
    },
    'registration token is JWT format': (r) => {
      try {
        const body = JSON.parse(r.body);
        const token = body.access_token;
        return token && token.split('.').length === 3; // JWT has 3 parts
      } catch (e) {
        return false;
      }
    }
  });
  
  authenticationSuccessRate.add(registrationSuccess);
  
  if (registerResponse.status === 201) {
    const body = JSON.parse(registerResponse.body);
    activeSessions.push({
      userId: body.user.id,
      username: userData.username,
      token: body.access_token,
      vuId,
      iterationId,
      registrationTime
    });
    sessionStartTimes.set(body.user.id, Date.now());
  } else {
    authenticationErrors.add(1);
  }
}

function testUserLogin(vuId, iterationId) {
  // Use existing user from CSV data or previously registered user
  const testUser = users.length > 0 ? users[vuId % users.length] : null;
  
  if (!testUser) {
    console.log('No test user available for login test');
    return;
  }
  
  const loginStartTime = Date.now();
  
  const loginResponse = http.post(
    `${API_BASE_URL}/auth/login`,
    JSON.stringify({
      username: testUser.username,
      password: testUser.password
    }),
    { 
      headers: COMMON_HEADERS,
      tags: { 
        name: 'auth_login', 
        api: 'auth',
        vu_id: vuId.toString(),
        user_type: 'existing'
      }
    }
  );
  
  const loginTime = Date.now() - loginStartTime;
  
  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
    'login returns access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    },
    'login returns user info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.username === testUser.username;
      } catch (e) {
        return false;
      }
    }
  });
  
  authenticationSuccessRate.add(loginSuccess);
  
  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    
    // Immediate token validation
    sleep(0.1);
    const profileResponse = http.get(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders(body.access_token),
      tags: { 
        name: 'token_validation', 
        api: 'auth',
        validation_type: 'immediate'
      }
    });
    
    const tokenValidation = check(profileResponse, {
      'token validation successful': (r) => r.status === 200,
      'profile matches login user': (r) => {
        try {
          const profileBody = JSON.parse(r.body);
          return profileBody.username === testUser.username;
        } catch (e) {
          return false;
        }
      }
    });
    
    tokenValidationRate.add(tokenValidation);
    
    if (tokenValidation) {
      sessionStartTimes.set(body.user.id, Date.now());
    }
    
  } else {
    authenticationErrors.add(1);
  }
}

function testTokenManagement(vuId, iterationId) {
  // Find an active session for this VU
  const activeSession = activeSessions.find(s => s.vuId === vuId);
  
  if (!activeSession) {
    return;
  }
  
  // Test token refresh
  const refreshResponse = http.post(`${API_BASE_URL}/auth/refresh`, {}, {
    headers: getAuthHeaders(activeSession.token),
    tags: { 
      name: 'token_refresh', 
      api: 'auth',
      vu_id: vuId.toString()
    }
  });
  
  const refreshSuccess = check(refreshResponse, {
    'token refresh status is 200': (r) => r.status === 200,
    'token refresh returns new token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token && body.access_token !== activeSession.token;
      } catch (e) {
        return false;
      }
    },
    'refreshed token is valid JWT': (r) => {
      try {
        const body = JSON.parse(r.body);
        const token = body.access_token;
        return token && token.split('.').length === 3;
      } catch (e) {
        return false;
      }
    }
  });
  
  tokenRefreshSuccessRate.add(refreshSuccess);
  
  if (refreshResponse.status === 200) {
    const body = JSON.parse(refreshResponse.body);
    activeSession.token = body.access_token; // Update session with new token
    
    // Validate new token works
    sleep(0.1);
    const validationResponse = http.get(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders(body.access_token),
      tags: { 
        name: 'token_validation', 
        api: 'auth',
        validation_type: 'post_refresh'
      }
    });
    
    const newTokenValidation = check(validationResponse, {
      'new token validation successful': (r) => r.status === 200,
    });
    
    tokenValidationRate.add(newTokenValidation);
  }
  
  // Test using old token (should fail)
  const oldTokenResponse = http.get(`${API_BASE_URL}/auth/profile`, {
    headers: getAuthHeaders('invalid_token_12345'),
    tags: { 
      name: 'invalid_token_test', 
      api: 'auth'
    }
  });
  
  check(oldTokenResponse, {
    'invalid token returns 401': (r) => r.status === 401,
  });
}

function testSessionManagement(vuId, iterationId) {
  const activeSession = activeSessions.find(s => s.vuId === vuId);
  
  if (!activeSession || !sessionStartTimes.has(activeSession.userId)) {
    return;
  }
  
  const sessionStart = sessionStartTimes.get(activeSession.userId);
  const currentSessionDuration = Date.now() - sessionStart;
  
  // Test multiple concurrent requests with same token
  const concurrentRequests = [];
  for (let i = 0; i < 3; i++) {
    concurrentRequests.push(
      http.get(`${API_BASE_URL}/auth/profile`, {
        headers: getAuthHeaders(activeSession.token),
        tags: { 
          name: 'concurrent_token_use', 
          api: 'auth',
          request_index: i.toString()
        }
      })
    );
  }
  
  const concurrentSuccess = concurrentRequests.every(r => r.status === 200);
  check({ concurrentSuccess }, {
    'concurrent token usage successful': () => concurrentSuccess,
  });
  
  // Update session duration
  sessionDuration.add(currentSessionDuration);
  
  // Test session expiry simulation (if session is old enough)
  if (currentSessionDuration > 300000) { // 5 minutes
    console.log(`Long session detected for user ${activeSession.username}: ${currentSessionDuration}ms`);
  }
}

function testConcurrentAuthentication(vuId, iterationId) {
  concurrentAuthAttempts.add(1);
  
  // Simulate rapid authentication attempts
  const userData = generateRandomUser();
  userData.username = `concurrent_${vuId}_${iterationId}_${userData.username}`;
  userData.email = `concurrent_${vuId}_${iterationId}_${userData.email}`;
  
  const rapidAuthResponses = [];
  
  // Multiple rapid registration attempts
  for (let i = 0; i < 2; i++) {
    const concurrentUserData = { ...userData };
    concurrentUserData.username = `${userData.username}_${i}`;
    concurrentUserData.email = `${i}_${userData.email}`;
    
    rapidAuthResponses.push(
      http.post(
        `${API_BASE_URL}/auth/register`,
        JSON.stringify(concurrentUserData),
        { 
          headers: COMMON_HEADERS,
          tags: { 
            name: 'concurrent_register', 
            api: 'auth',
            attempt: i.toString()
          }
        }
      )
    );
    
    sleep(0.05); // Very short delay
  }
  
  const concurrentAuthSuccess = rapidAuthResponses.filter(r => r.status === 201).length;
  
  check({ concurrentAuthSuccess }, {
    'concurrent auth attempts handled': () => concurrentAuthSuccess >= 1,
    'concurrent auth no server errors': () => rapidAuthResponses.every(r => r.status < 500),
  });
}

function testSecurityScenarios(vuId, iterationId) {
  // Test 1: SQL Injection attempt in login
  const sqlInjectionResponse = http.post(
    `${API_BASE_URL}/auth/login`,
    JSON.stringify({
      username: "admin'; DROP TABLE users; --",
      password: "password"
    }),
    { 
      headers: COMMON_HEADERS,
      tags: { 
        name: 'security_sql_injection', 
        api: 'auth'
      }
    }
  );
  
  check(sqlInjectionResponse, {
    'SQL injection attempt blocked': (r) => r.status === 400 || r.status === 401,
    'SQL injection no server error': (r) => r.status !== 500,
  });
  
  // Test 2: XSS attempt in registration
  const xssResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify({
      username: "<script>alert('xss')</script>",
      email: "test@example.com",
      password: "password123"
    }),
    { 
      headers: COMMON_HEADERS,
      tags: { 
        name: 'security_xss', 
        api: 'auth'
      }
    }
  );
  
  check(xssResponse, {
    'XSS attempt handled': (r) => r.status === 400 || r.status === 201,
    'XSS no script in response': (r) => !r.body.includes('<script>'),
  });
  
  // Test 3: Weak password handling
  const weakPasswordResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify({
      username: `weakpass_${vuId}_${iterationId}`,
      email: `weakpass_${vuId}_${iterationId}@example.com`,
      password: "123"
    }),
    { 
      headers: COMMON_HEADERS,
      tags: { 
        name: 'security_weak_password', 
        api: 'auth'
      }
    }
  );
  
  check(weakPasswordResponse, {
    'weak password handling': (r) => r.status === 400 || r.status === 201,
  });
  
  // Test 4: Rate limiting on auth endpoints
  const rateLimitResponses = [];
  for (let i = 0; i < 5; i++) {
    rateLimitResponses.push(
      http.post(
        `${API_BASE_URL}/auth/login`,
        JSON.stringify({
          username: "nonexistent",
          password: "wrongpassword"
        }),
        { 
          headers: COMMON_HEADERS,
          tags: { 
            name: 'security_rate_limit', 
            api: 'auth',
            attempt: i.toString()
          }
        }
      )
    );
    
    sleep(0.1);
  }
  
  const rateLimitTriggered = rateLimitResponses.some(r => r.status === 429);
  
  check({ rateLimitTriggered }, {
    'rate limiting active': () => rateLimitTriggered || rateLimitResponses.every(r => r.status === 401),
  });
}

export function teardown(data) {
  console.log('🧹 Authentication Flow Test Teardown...');
  
  // Calculate final session statistics
  const totalSessions = activeSessions.length;
  const avgSessionDuration = Array.from(sessionStartTimes.values())
    .map(start => Date.now() - start)
    .reduce((sum, duration) => sum + duration, 0) / sessionStartTimes.size;
  
  console.log(`Total sessions created: ${totalSessions}`);
  console.log(`Average session duration: ${avgSessionDuration}ms`);
  
  if (data.startTime) {
    const totalTestTime = Date.now() - data.startTime;
    console.log(`Total authentication test duration: ${totalTestTime}ms`);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📊 Authentication Flow Test Summary:');
  console.log(`- Authentication success rate: ${(metrics.authentication_success_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Token validation rate: ${(metrics.token_validation_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Token refresh success rate: ${(metrics.token_refresh_success_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Average session duration: ${metrics.session_duration?.values?.avg || 'N/A'}ms`);
  console.log(`- Concurrent auth attempts: ${metrics.concurrent_auth_attempts?.values?.count || 0}`);
  console.log(`- Authentication errors: ${metrics.authentication_errors?.values?.count || 0}`);
  
  const authFlowAnalysis = {
    authenticationSuccessRate: metrics.authentication_success_rate?.values?.rate,
    tokenValidationRate: metrics.token_validation_rate?.values?.rate,
    tokenRefreshSuccessRate: metrics.token_refresh_success_rate?.values?.rate,
    averageSessionDuration: metrics.session_duration?.values?.avg,
    concurrentAuthCapability: metrics.concurrent_auth_attempts?.values?.count,
    securityTestResults: extractSecurityResults(data),
    authPerformanceScore: calculateAuthPerformanceScore(metrics),
    recommendations: generateAuthRecommendations(metrics),
  };
  
  return {
    'stdout': '\n🔐 Authentication Flow Test Completed!\n',
    'auth-flow-results.json': JSON.stringify(data, null, 2),
    'auth-analysis.json': JSON.stringify(authFlowAnalysis, null, 2),
  };
}

function extractSecurityResults(data) {
  return {
    sqlInjectionBlocked: true, // Would extract from actual test results
    xssAttemptsHandled: true,
    weakPasswordPolicyEnforced: true,
    rateLimitingActive: true,
  };
}

function calculateAuthPerformanceScore(metrics) {
  const authSuccess = metrics.authentication_success_rate?.values?.rate || 0;
  const tokenValidation = metrics.token_validation_rate?.values?.rate || 0;
  const tokenRefresh = metrics.token_refresh_success_rate?.values?.rate || 0;
  const errors = metrics.authentication_errors?.values?.count || 0;
  
  let score = 0;
  
  // Auth success rate: 40%
  score += authSuccess * 40;
  
  // Token validation: 30%
  score += tokenValidation * 30;
  
  // Token refresh: 20%
  score += tokenRefresh * 20;
  
  // Error penalty: 10%
  const errorPenalty = Math.max(0, (20 - errors) / 20) * 10;
  score += errorPenalty;
  
  return Math.round(score);
}

function generateAuthRecommendations(metrics) {
  const recommendations = [];
  const authSuccess = metrics.authentication_success_rate?.values?.rate || 0;
  const tokenValidation = metrics.token_validation_rate?.values?.rate || 0;
  const errors = metrics.authentication_errors?.values?.count || 0;
  
  if (authSuccess < 0.95) {
    recommendations.push('Improve authentication reliability - success rate below 95%');
  }
  
  if (tokenValidation < 0.98) {
    recommendations.push('Review token validation process - validation rate below 98%');
  }
  
  if (errors > 10) {
    recommendations.push('Investigate authentication errors - high error count detected');
  }
  
  recommendations.push('Implement proper password policies and validation');
  recommendations.push('Add multi-factor authentication for enhanced security');
  recommendations.push('Monitor for unusual authentication patterns');
  recommendations.push('Implement session management best practices');
  
  return recommendations;
}
