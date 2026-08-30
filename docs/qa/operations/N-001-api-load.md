# N-001 — Authenticated API workload load test

**Owner:** Performance lead. **Status:** implemented.

Install k6 from <https://grafana.com/docs/k6/latest/set-up/install-k6/> and validate locally with `k6 inspect qa/n-001-api-load.js`. Use only a disposable environment: this workload authenticates, reads cards, creates transactions, and creates reports.

```bash
API_BASE_URL=https://test-api.example.invalid API_USER_ID=USER0001 API_PASSWORD=User123! API_WORKLOAD_ACKNOWLEDGEMENT=WRITE_REPORT_TEST_DATA ALLOW_NONPROD_TARGET=true k6 run qa/n-001-api-load.js
```

Capture k6 thresholds plus database connection/error metrics. **Pass:** read/write/report checks and thresholds pass. **Fail:** stop on availability or error regression and retain evidence.
