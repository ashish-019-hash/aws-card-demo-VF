import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.API_BASE_URL || '').replace(/\/$/, '');
const userId = __ENV.API_USER_ID || '';
const password = __ENV.API_PASSWORD || '';
const accountId = __ENV.API_ACCOUNT_ID || '00000000001';
const vus = Number(__ENV.K6_VUS || 5);
const duration = __ENV.K6_DURATION || '30s';
const errorRate = new Rate('api_workload_errors');
const requests = new Counter('api_workload_requests');
const latency = new Trend('api_workload_latency', true);

if (!baseUrl || !userId || !password) throw new Error('API_BASE_URL, API_USER_ID, and API_PASSWORD are required.');
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/.test(baseUrl) && __ENV.ALLOW_NONPROD_TARGET !== 'true') {
  throw new Error('Refusing a remote target. Set ALLOW_NONPROD_TARGET=true only for an approved disposable non-production environment.');
}
if (__ENV.API_WORKLOAD_ACKNOWLEDGEMENT !== 'WRITE_REPORT_TEST_DATA') {
  throw new Error('Set API_WORKLOAD_ACKNOWLEDGEMENT=WRITE_REPORT_TEST_DATA; this workload creates transactions and reports.');
}
if (!Number.isInteger(vus) || vus < 1 || vus > 100) throw new Error('K6_VUS must be an integer from 1 through 100.');

export const options = { vus, duration, thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<750'], api_workload_errors: ['rate<0.01'] } };

function request(method, path, body, params = {}) {
  const response = http.request(method, `${baseUrl}${path}`, body, { headers: { 'Content-Type': 'application/json', ...(params.headers || {}) }, tags: params.tags });
  requests.add(1); latency.add(response.timings.duration);
  return response;
}

export default function () {
  const login = request('POST', '/api/auth/sign-in', JSON.stringify({ userId, password }), { tags: { operation: 'sign-in' } });
  let ok = check(login, { 'sign-in succeeds': r => r.status === 200 });
  const cards = request('GET', `/api/cards?accountId=${accountId}&limit=1`, null, { tags: { operation: 'read-cards' } });
  ok = check(cards, { 'authenticated DB read succeeds': r => r.status === 200 && r.json('data.items.0.number') }) && ok;
  const cardNumber = cards.json('data.items.0.number');
  if (cardNumber) {
    const key = `load-${__VU}-${__ITER}-${Date.now()}`;
    const transaction = request('POST', '/api/transactions', JSON.stringify({ cardNumber, typeCode: '01', categoryCode: '0001', source: 'K6 LOAD', description: `load test ${__VU}/${__ITER}`, amount: 1.01 }), { headers: { 'Idempotency-Key': key }, tags: { operation: 'write-transaction' } });
    ok = check(transaction, { 'authenticated DB write succeeds': r => r.status === 201 }) && ok;
  } else { ok = false; }
  const report = request('POST', '/api/reports', JSON.stringify({ period: 'custom', startDate: '2022-06-01', endDate: '2022-06-30' }), { tags: { operation: 'write-report' } });
  ok = check(report, { 'authenticated report creation succeeds': r => r.status === 201 && r.json('data.id') }) && ok;
  errorRate.add(!ok); sleep(1);
}
