# N-003 — Authenticated pool saturation

**Owner:** Performance lead. **Status:** implemented.

Install k6 from <https://grafana.com/docs/k6/latest/set-up/install-k6/> and validate with `k6 inspect express-backend/qa/n-003-pool-saturation.js`. On a disposable target only, set `DB_POOL_MAX` and start with `K6_VUS=DB_POOL_MAX+2`. The workload authenticates and exercises DB-backed account reads and report writes.

```bash
API_BASE_URL=https://test-api.example.invalid API_USER_ID=USER0001 API_PASSWORD=User123! DB_POOL_MAX=10 K6_VUS=12 API_WORKLOAD_ACKNOWLEDGEMENT=WRITE_REPORT_TEST_DATA ALLOW_NONPROD_TARGET=true k6 run express-backend/qa/n-003-pool-saturation.js
```

**Pass:** p95/error thresholds pass and connections return to baseline. **Fail:** stop for saturation, leak, availability loss, or persistent recovery.
