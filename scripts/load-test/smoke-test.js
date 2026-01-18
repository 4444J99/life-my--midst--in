import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';

export default function () {
  const endpoints = [
    '/health',
    '/ready',
    '/profiles',
    '/taxonomy/masks',
    '/taxonomy/epochs',
    '/taxonomy/stages',
  ];

  endpoints.forEach(endpoint => {
    const res = http.get(`${BASE_URL}${endpoint}`, {
      tags: { endpoint }
    });
    
    requestDuration.add(res.timings.duration);
    
    const success = check(res, {
      'status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
    });
    
    errorRate.add(!success);
  });
  
  sleep(1);
}
