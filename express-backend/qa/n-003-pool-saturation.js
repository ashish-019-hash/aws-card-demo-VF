import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseUrl = (__ENV.API_BASE_URL || '').replace(/\/$/, '');
const userId = __ENV.API_USER_ID || '';
const password = __ENV.API_PASSWORD || '';
const accountId = __ENV.API_ACCOUNT_ID || '00000000001';
const poolMax = Number(__ENV.DB_POOL_MAX || 10);
const vus = Number(__ENV.K6_VUS || poolMax + 2);
const duration = __ENV.K6_DURATION || '20s';
const errors = new Rate('pool_saturation_errors');

if (!baseUrl || !userId || !password) throw new Error('API_BASE_URL, API_USER_ID, and API_PASSWORD are required.');
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/.test(baseUrl) && __ENV.ALLOW_NONPROD_TARGET !== 'true') throw new Error('Refusing remote target without ALLOW_NONPROD_TARGET=true.');
if (__ENV.API_WORKLOAD_ACKNOWLEDGEMENT !== 'WRITE_REPORT_TEST_DATA') throw new Error('Set API_WORKLOAD_ACKNOWLEDGEMENT=WRITE_REPORT_TEST_DATA; this workload creates reports.');
if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 100) throw new Error('DB_POOL_MAX must be an integer from 1 through 100.');
if (!Number.isInteger(vus) || vus < poolMax || vus > 200) throw new Error('K6_VUS must be between DB_POOL_MAX and 200.');
export const options = { vus, duration, thresholds: { http_req_failed: ['rate<0.02'], http_req_duration: ['p(95)<1000'], pool_saturation_errors: ['rate<0.02'] } };
function call(method, path, body, headers = {}) { return http.request(method, `${baseUrl}${path}`, body, { headers: { 'Content-Type': 'application/json', ...headers }, tags: { scenario: 'pool-saturation', endpoint: path } }); }
export default function () {
  let ok = check(call('POST', '/api/auth/sign-in', JSON.stringify({ userId, password })), { 'sign-in succeeds': r => r.status === 200 });
  ok = check(call('GET', `/api/accounts/${accountId}`, null), { 'DB-backed account read succeeds': r => r.status === 200 }) && ok;
  ok = check(call('POST', '/api/reports', JSON.stringify({ period: 'custom', startDate: '2022-06-01', endDate: '2022-06-30' })), { 'DB-backed report write succeeds': r => r.status === 201 }) && ok;
  errors.add(!ok); sleep(0.2);
}
