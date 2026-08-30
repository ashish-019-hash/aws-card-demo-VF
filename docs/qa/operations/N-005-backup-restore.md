# N-005 — Backup/restore reconciliation

## Ownership and status
- **Owner:** Database operations lead
- **Status:** implemented

## Prerequisites and safety
- PostgreSQL client tools and separate source/restore URLs whose database names include `test`; the restore database may not exist.
- Set `CONFIRM_DISPOSABLE_RESTORE=YES` and `NONPROD_TARGET=YES` only after confirming the restore database is disposable.
- The script drops/creates only `RESTORE_DATABASE_NAME`; PostgreSQL clients receive `PG*` variables rather than URL command arguments.

## Steps
1. Validate a fresh restore target without connecting:
   ```bash
   SOURCE_TEST_DATABASE_URL='postgresql://user:password@host/carddemo_source_test' RESTORE_DATABASE_URL='postgresql://user:password@host/carddemo_restore_test' RESTORE_DATABASE_NAME=carddemo_restore_test CONFIRM_DISPOSABLE_RESTORE=YES NONPROD_TARGET=YES DRY_RUN=1 express-backend/qa/n-005-backup-restore.sh
   ```
2. Execute in an approved window. The script captures dump checksum/list and reconciles schema, migrations, table rows, sequences, and a direct restored-database `users` query.
3. Optional restored-app smoke is intentionally gated. Start an API instance explicitly configured with `DATABASE_URL` equal to the restore URL, then run with `RESTORED_API_SMOKE=YES`, `RESTORED_API_BASE_URL`, and disposable test credentials. The script signs in and reads account `00000000001`; it does not infer an API-to-database mapping.

## Expected evidence and decision
- Custom dump SHA-256/list, matching schema/migration/row/sequence snapshots, direct database smoke result, and—when enabled—authenticated restored-app smoke output.
- **Pass:** every reconciliation and selected smoke check passes. **Fail:** target identity, restore, reconciliation, or explicitly enabled app smoke mismatch blocks promotion.
