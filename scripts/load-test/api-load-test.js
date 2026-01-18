import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const successRate = new Rate('success');
const requestDuration = new Trend('request_duration');
const requestCount = new Counter('requests');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '2m', target: 1000 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    'http_req_duration{route:health}': ['p(95)<100'],
    'http_req_duration{route:profiles}': ['p(95)<500'],
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
  const scenarios = [
    { weight: 0.4, fn: healthCheck },
    { weight: 0.3, fn: listProfiles },
    { weight: 0.15, fn: getProfile },
    { weight: 0.10, fn: listMasks },
    { weight: 0.05, fn: readyCheck },
  ];

  const random = Math.random();
  let cumulative = 0;
  
  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random < cumulative) {
      scenario.fn(data.baseUrl);
      break;
    }
  }
  
  sleep(Math.random() * 2);
}

function healthCheck(baseUrl) {
  const res = http.get(`${baseUrl}/health`, {
    tags: { route: 'health' }
  });
  
  requestCount.add(1);
  requestDuration.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  successRate.add(success);
}

function readyCheck(baseUrl) {
  const res = http.get(`${baseUrl}/ready`, {
    tags: { route: 'ready' }
  });
  
  requestCount.add(1);
  requestDuration.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
  });
  
  errorRate.add(!success);
  successRate.add(success);
}

function listProfiles(baseUrl) {
  const res = http.get(`${baseUrl}/profiles`, {
    tags: { route: 'profiles' }
  });
  
  requestCount.add(1);
  requestDuration.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has profiles array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.profiles);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
  successRate.add(success);
}

function getProfile(baseUrl) {
  const profileId = `test-profile-${Math.floor(Math.random() * 100)}`;
  const res = http.get(`${baseUrl}/profiles/${profileId}`, {
    tags: { route: 'profile_detail' }
  });
  
  requestCount.add(1);
  requestDuration.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  successRate.add(success);
}

function listMasks(baseUrl) {
  const res = http.get(`${baseUrl}/taxonomy/masks`, {
    tags: { route: 'masks' }
  });
  
  requestCount.add(1);
  requestDuration.add(res.timings.duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!success);
  successRate.add(success);
}

export function teardown(data) {
  console.log('Load test completed');
}
