# QA automation entry points

This directory is the discoverable manifest for the full 56-item QA catalog (`automation-catalog.md`). Run `qa/catalog.sh` to print it or `qa/catalog.sh --check` to validate traceability.

## Tooling

- Shell scripts require Bash, Python 3, and PostgreSQL client tools where stated.
- k6: install from [grafana.com/docs/k6/latest/set-up/install-k6/](https://grafana.com/docs/k6/latest/set-up/install-k6/), then validate syntax with `k6 inspect qa/n-001-api-load.js` and `k6 inspect express-backend/qa/n-003-pool-saturation.js`.
- Run `qa/f-025-static-safety.sh` before operational review. It validates shell/Node syntax and performs the Angular production build.

## Commands

| Script | Command |
|---|---|
| N-001 | `k6 run qa/n-001-api-load.js` |
| N-002 | `express-backend/qa/n-002-query-plan.sh` |
| N-003 | `k6 run express-backend/qa/n-003-pool-saturation.js` |
| N-004 | `express-backend/qa/n-004-managed-db-tls.sh` |
| N-005 | `express-backend/qa/n-005-backup-restore.sh` |
| N-006 | `express-backend/qa/n-006-restart-failover.sh` |
| N-007 | `express-backend/qa/n-007-observability-retention.sh` |
| F-025 | `qa/f-025-static-safety.sh` |
| Full catalog | `qa/catalog.sh --check` |

Read the matching procedure in `docs/qa/operations/` before executing an environment-dependent command. Every such command fails closed unless its non-production and disposable-target acknowledgements are supplied.
