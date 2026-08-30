# N-006 — Restart/failover recovery drill

## Ownership and status
- **Owner:** Database operations lead
- **Status:** implemented

## Prerequisites and safety
- Dedicated disposable test database, approved change ID, test API credentials, and a reviewed executable local platform-command file.
- The harness rejects inline commands and validates the current database name against the guarded target before disruption.

## Steps
1. Review and hash the executable command file; confirm it identifies only the approved disposable target.
2. Dry-run with `DISPOSABLE_TARGET=YES`, `CHANGE_APPROVAL_ID`, and `APPROVED_COMMAND_FILE`.
3. Execute with a witness. The harness probes the authenticated DB-backed account endpoint and `current_database()` before disruption, records every in-flight recovery probe, and requires `MIN_SUCCESSFUL_RECOVERY_PROBES` consecutive endpoint-plus-database successes before passing.

## Expected evidence and decision
- Target identity, approval ID, command hash, in-flight probe outcomes, transient failure count, recovery time, and consecutive successful recovery probes.
- **Pass:** only the approved target is disrupted and database connection plus DB-backed endpoint recovery meet the configured consecutive-probe requirement. **Fail:** identity mismatch, unavailable connection, failed probe, or timeout requires escalation.
