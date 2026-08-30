# N-004 — Managed DB TLS validation

## Prerequisites and safety
- **Owner:** Database operations lead. **Status:** implemented.
- An approved managed test database, its CA bundle, and a DNS alias for that same test endpoint which is deliberately absent from the certificate.
- Never set `DB_SSL_REJECT_UNAUTHORIZED=false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, or a weaker libpq ssl mode.

## Steps
1. Validate configuration without a connection:
   ```bash
   MANAGED_TEST_DATABASE_URL='postgresql://user:password@test-db.example.invalid/carddemo_test' DB_SSL_CA_FILE=/secure/ca.pem TLS_WRONG_HOST=untrusted-alias.example.invalid NONPROD_TARGET=YES DRY_RUN=1 express-backend/qa/n-004-managed-db-tls.sh
   ```
2. Run the same command without `DRY_RUN=1`. The script parses the URL only to set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`; it does not pass the URL to `psql`.

## Expected evidence and decision
- A verified `PGSSLMODE=verify-full` / `PGSSLROOTCERT` connection reports TLS active.
- Wrong-CA and wrong-hostname connections fail.
- **Pass:** all three conditions occur against the test database. **Fail:** any successful negative connection or insecure override blocks release.
