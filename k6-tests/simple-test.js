import { check } from 'k6';
import http from 'k6/http';

export const options = {
  duration: '10s',
  vus: 2,
};

export default function() {
  const response = http.get('http://localhost:3001/api/v1/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
