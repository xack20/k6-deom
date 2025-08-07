import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '5s', target: 5 },   // Ramp up to 5 users
    { duration: '10s', target: 5 },  // Stay at 5 users
    { duration: '5s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_failed': ['rate<0.1'],     // Error rate under 10%
  },
};

export default function() {
  // Test health endpoint
  const healthResponse = http.get('http://localhost:3001/api/v1/health');
  check(healthResponse, {
    'health check successful': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 1000,
  });
  
  sleep(1); // 1 second think time
  
  // Test products endpoint
  const productsResponse = http.get('http://localhost:3001/api/v1/products?limit=10');
  check(productsResponse, {
    'products fetch successful': (r) => r.status === 200,
    'has products': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.products && body.products.length > 0;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(1); // Another second of think time
}
