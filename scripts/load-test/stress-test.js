import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

export const options = {
  stages: [
    { duration: '5m', target: 2000 },
    { duration: '10m', target: 2000 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';

export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`API not healthy: ${res.status}`);
  }
  return { baseUrl: BASE_URL };
}

export default function (data) {
  const endpoints = [
    { path: '/health', weight: 0.3 },
    { path: '/ready', weight: 0.1 },
    { path: '/profiles', weight: 0.25 },
    { path: '/taxonomy/masks', weight: 0.2 },
    { path: '/taxonomy/epochs', weight: 0.1 },
    { path: '/taxonomy/stages', weight: 0.05 },
  ];

  const random = Math.random();
  let cumulative = 0;
  let selectedEndpoint = endpoints[0].path;
  
  for (const endpoint of endpoints) {
    cumulative += endpoint.weight;
    if (random < cumulative) {
      selectedEndpoint = endpoint.path;
      break;
    }
  }

  const res = http.get(`${data.baseUrl}${selectedEndpoint}`, {
    tags: { endpoint: selectedEndpoint }
  });
  
  requestDuration.add(res.timings.duration);
  
  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time acceptable': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  sleep(Math.random() * 3);
}

export function teardown(data) {
  console.log('Stress test completed');
}
