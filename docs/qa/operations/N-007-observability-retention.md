# N-007 — Observability, redaction, and retention checks

## Ownership and status
- **Owner:** Platform observability lead
- **Status:** implemented

## Prerequisites and safety
- Test database URL, API health URL, `psql`, `curl`, dashboard/log access, and approved retention policy.
- The automated portion is read-only, requires `TEST_DATABASE_URL` and `NONPROD_TARGET=YES`, and must not be run against production.

## Steps
1. Confirm guard behavior with `DRY_RUN=1`, then execute the read-only database/health checks.
2. Review the deployment scheduler: record the cleanup job identifier, schedule, last successful execution, next execution, and its least-privilege test/non-production target.
3. Search the bounded application log window around a sign-in, failed sign-in, and report request for unmasked passwords, session IDs, authorization headers, connection URLs, PGPASSWORD, or secret/token values. Retain redacted evidence only.
4. Attach health/error/latency/connection dashboards, retention index output, stale-row result, scheduler evidence, and redaction review to the release record.

## Expected evidence and decision
- Health is `ok`; retention indexes and stale-row threshold pass.
- Scheduled cleanup evidence demonstrates the configured retention policy is actually running.
- Log review finds no sensitive value disclosure.
- **Pass:** all automated and manual evidence passes. **Fail:** missing scheduler, retention breach, or sensitive log disclosure blocks release and requires remediation.
