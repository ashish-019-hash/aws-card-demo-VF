# QA automation catalog and 56-item traceability

`qa/catalog.sh` is the aggregate discovery command. It prints this table and, with `--check`, validates all catalog IDs are represented exactly once. This catalog is a traceability index: detailed procedures live under `docs/qa/operations/` and `docs/qa/manual/`; executable test locations are shown for implemented entries.

## Status legend

- **IMPLEMENTED:** executable test/script or completed review procedure exists.
- **READY:** manual execution/sign-off remains, with a complete runbook.
- **BLOCKED:** a defined external design/oracle decision prevents completion.
- **PLANNED:** cataloged coverage without a dedicated executable asset in this checkout.

| ID | Coverage / target | Owner | Type | Status | Traceability |
|---|---|---|---|---|---|
| U-001 | Database/session primitives | Backend quality | unit | IMPLEMENTED | `express-backend/test/unit/` |
| U-002 | Fixed-width import parser | Backend quality | unit | IMPLEMENTED | `test/unit/import-parser.test.js` |
| U-003 | Repository mappers | Backend quality | unit | IMPLEMENTED | `test/unit/repository-mappers.test.js` |
| U-004 | Session store | Backend quality | unit | IMPLEMENTED | `test/unit/session-store.test.js` |
| U-005 | DB configuration | Backend quality | unit | IMPLEMENTED | `test/unit/db.test.js` |
| U-006 | Request validation unit coverage | Backend quality | unit | PLANNED | Traceability placeholder; behavior is currently exercised through F-001/F-024 |
| U-007 | Authorization helper unit coverage | Security | unit | PLANNED | Traceability placeholder; behavior is currently exercised through F-009/F-012 |
| U-008 | Report formatting unit coverage | Reporting quality | unit | PLANNED | Traceability placeholder; behavior is currently exercised through F-018 |
| U-009 | Retention policy unit coverage | Platform quality | unit | PLANNED | Traceability placeholder; behavior is currently exercised through F-021 |
| F-001 | API baseline workflow | Backend quality | functional | IMPLEMENTED | `express-backend/test/api.test.js` |
| F-002 | Guarded test-database runner | Backend quality | functional | IMPLEMENTED | `express-backend/test/harness/f-002-guarded-runner.test.js` |
| F-003 | ASCII import and rollback | Data quality | functional | IMPLEMENTED | `functional/data-contract/import-and-ebcdic.mjs` |
| F-004 | CP037/EBCDIC normalization | Data quality | functional | IMPLEMENTED | `functional/data-contract/import-and-ebcdic.mjs` |
| F-005 | Migration replay | Backend quality | functional | IMPLEMENTED | `functional/migration-replay.mjs` |
| F-006 | Migration locking | Backend quality | functional | IMPLEMENTED | `functional/data-contract/migrations-and-seed.mjs` |
| F-007 | Seed idempotency | Data quality | functional | IMPLEMENTED | `functional/data-contract/migrations-and-seed.mjs` |
| F-008 | OpenAPI route/contract inventory | API quality | functional | IMPLEMENTED | `functional/data-contract/openapi-contract.mjs` |
| F-009 | Error and secret redaction | Security | functional | IMPLEMENTED | `functional/security-contract/api-errors-and-sessions.mjs` |
| F-010 | Session lifecycle | Security | functional | IMPLEMENTED | `functional/security-contract/api-errors-and-sessions.mjs` |
| F-011 | Cookie/CSRF posture | Security | functional | IMPLEMENTED | `functional/security-contract/api-errors-and-sessions.mjs` |
| F-012 | Global-U authorization policy | Security | functional | IMPLEMENTED | `functional/security-contract/global-u-policy.mjs` |
| F-013 | Accounts/customers | Backend quality | functional | IMPLEMENTED | `functional/business/accounts-customers.mjs` |
| F-014 | Cards | Backend quality | functional | IMPLEMENTED | `functional/business/cards.mjs` |
| F-015 | Transaction idempotency | Backend quality | concurrency | IMPLEMENTED | `functional/concurrency/transactions-idempotency.mjs` |
| F-016 | Billing atomicity | Backend quality | concurrency | IMPLEMENTED | `functional/concurrency/billing-atomicity.mjs` |
| F-017 | Persisted report authorized-domain scope | Reporting-domain design | functional | **BLOCKED — P0** | Target: define user-account authorization/reporting domain before persisted content scope; `functional/business/report-scope-f017.blocked.mjs` |
| F-018 | Reports | Backend quality | functional | IMPLEMENTED | `functional/business/reports.mjs` |
| F-019 | Admin CRUD | Backend quality | functional | IMPLEMENTED | `functional/business/admin-crud.mjs` |
| F-020 | Admin lock ordering | Backend quality | concurrency | IMPLEMENTED | `functional/concurrency/admin-lock-order.mjs` |
| F-021 | Cleanup retention | Platform quality | functional | IMPLEMENTED | `functional/business/cleanup-retention.mjs` |
| F-022 | Repeatability | Backend quality | functional | IMPLEMENTED | `scripts/repeat-functional.js` |
| F-023 | Financial workflow | Backend quality | functional | IMPLEMENTED | `functional/financial-workflows.mjs` |
| F-024 | Contract fuzzing | API quality | functional | IMPLEMENTED | `functional/data-contract/contract-fuzz.mjs` |
| F-025 | Static operational safety | Security/platform | static | IMPLEMENTED | `qa/f-025-static-safety.sh` |
| E-001 | Business workflow | Frontend quality | E2E | IMPLEMENTED | `angular-frontend/e2e/E-001-business-workflow.spec.ts` |
| E-002 | Admin workflow | Frontend quality | E2E | IMPLEMENTED | `angular-frontend/e2e/E-002-admin-workflow.spec.ts` |
| E-003 | Auth/deep-link/sign-out | Frontend quality | E2E | IMPLEMENTED | `angular-frontend/e2e/E-003-auth-deep-link-sign-out.spec.ts` |
| E-004 | Stale/idempotent retry | Frontend quality | E2E | IMPLEMENTED | `angular-frontend/e2e/E-004-stale-idempotent-retry.spec.ts` |
| E-005 | Persisted report authorized-domain UI scope | Reporting-domain design | E2E | **BLOCKED — P0** | Target: define F-017 authorization domain, then assert UI content/totals; `angular-frontend/e2e/E-005-report-owner-access.spec.ts` |
| E-006 | Accessibility | Accessibility | E2E | IMPLEMENTED | `angular-frontend/e2e/E-006-accessibility.spec.ts` |
| E-007 | Responsive behavior | Frontend quality | E2E | IMPLEMENTED | `angular-frontend/e2e/E-007-responsive.spec.ts` |
| E-008 | Cross-browser smoke | Frontend quality | E2E | IMPLEMENTED | `angular-frontend/e2e/E-008-cross-browser-smoke.spec.ts` |
| N-001 | Authenticated API load | Performance | k6 | IMPLEMENTED | `qa/n-001-api-load.js`; `docs/qa/operations/N-001-api-load.md` |
| N-002 | Query plan | Database performance | operational | IMPLEMENTED | `express-backend/qa/n-002-query-plan.sh`; `docs/qa/operations/N-002-query-plan.md` |
| N-003 | Pool saturation | Performance | k6 | IMPLEMENTED | `express-backend/qa/n-003-pool-saturation.js`; `docs/qa/operations/N-003-pool-saturation.md` |
| N-004 | Managed DB TLS | Database operations | operational | IMPLEMENTED | `express-backend/qa/n-004-managed-db-tls.sh`; `docs/qa/operations/N-004-managed-db-tls.md` |
| N-005 | Backup/restore drill | Database operations | operational | IMPLEMENTED | `express-backend/qa/n-005-backup-restore.sh`; `docs/qa/operations/N-005-backup-restore.md` |
| N-006 | Restart/failover recovery | Database operations | operational | IMPLEMENTED | `express-backend/qa/n-006-restart-failover.sh`; `docs/qa/operations/N-006-restart-failover.md` |
| N-007 | Observability/retention | Platform observability | operational | IMPLEMENTED | `express-backend/qa/n-007-observability-retention.sh`; `docs/qa/operations/N-007-observability-retention.md` |
| M-001 | Security global-U sign-off | Security lead | manual | READY | `docs/qa/manual/M-001-security-global-u-signoff.md` |
| M-002 | CSRF deployment review | Security/platform lead | manual | READY | `docs/qa/manual/M-002-csrf-deployment-review.md` |
| M-003 | Screen-reader keyboard E2E | Accessibility lead | manual | READY | `docs/qa/manual/M-003-screen-reader-keyboard-e2e.md` |
| M-004 | Managed DB recovery witness | Database operations lead | manual | READY | `docs/qa/manual/M-004-managed-db-recovery-witness.md` |
| M-005 | Legacy semantic review | Product/domain lead | manual | READY | `docs/qa/manual/M-005-legacy-semantic-review.md` |
| M-006 | COBOL behavioral parity | Modernization lead | manual | BLOCKED | `docs/qa/manual/M-006-cobol-behavioral-parity.md` |
| M-007 | COBOL byte/report parity | Modernization lead | manual | BLOCKED | `docs/qa/manual/M-007-cobol-byte-report-parity.md` |
