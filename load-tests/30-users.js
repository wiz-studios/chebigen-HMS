import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  vus: 30, // 30 virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.1'], // error rate should be below 10%
  },
};

const BASE_URL = 'http://localhost:3000';

// Simulated user session
export default function () {
  // Login request (if needed)
  // const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
  //   email: 'test@example.com',
  //   password: 'password',
  // });
  // check(loginRes, { 'logged in successfully': (r) => r.status === 200 });

  // Common API endpoints
  const endpoints = [
    // Dashboard stats
    { method: 'GET', path: '/api/dashboard/stats' },
    
    // Patient list with pagination
    { method: 'GET', path: '/api/patients?limit=10&page=1' },
    
    // Appointments for today
    { method: 'GET', path: '/api/appointments?limit=10&page=1' },
    
    // Billing summary
    { method: 'GET', path: '/api/billing/summary' },
    
    // Recent notifications
    { method: 'GET', path: '/api/notifications?limit=5' },
  ];

  // Execute requests
  endpoints.forEach(({ method, path }) => {
    const res = http.get(`${BASE_URL}${path}`);
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);

    // Random sleep between requests (100ms - 1s)
    sleep(Math.random() * 0.9 + 0.1);
  });

  // Simulate some write operations
  if (Math.random() < 0.1) { // 10% chance to create an appointment
    const appointmentRes = http.post(`${BASE_URL}/api/appointments`, JSON.stringify({
      patientId: 'test-patient-id',
      providerId: 'test-provider-id',
      scheduledTime: new Date().toISOString(),
      notes: 'Load test appointment',
    }));

    check(appointmentRes, {
      'appointment created': (r) => r.status === 201,
    }) || errorRate.add(1);
  }
}

// To run this test:
// 1. Install k6: https://k6.io/docs/getting-started/installation
// 2. Start your application server
// 3. Run: k6 run load-tests/30-users.js