# N-002 — Query-plan capture and assertions

## Ownership and status
- **Owner:** Database performance lead
- **Status:** implemented

## Prerequisites and safety
- `psql`, Python 3, an isolated seeded database whose name includes `test`, and a fixture report owned by `USER0001`.
- `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` **executes** the three read-only `SELECT` statements to collect actual timings and buffer use. It does not mutate data, but it may consume resources; use only an approved test database.
- `TEST_DATABASE_URL` and `NONPROD_TARGET=YES` are required. PostgreSQL receives `PG*` variables; the URL is not passed to `psql`.

## Steps
1. Validate the guard without connecting:
   ```bash
   TEST_DATABASE_URL='postgresql://user:password@host/carddemo_test' NONPROD_TARGET=YES DRY_RUN=1 express-backend/qa/n-002-query-plan.sh
   ```
2. Capture the plans after seeding and creating the fixture report:
   ```bash
   TEST_DATABASE_URL='postgresql://user:password@host/carddemo_test' NONPROD_TARGET=YES PLAN_OUTPUT=artifacts/query-plans.json express-backend/qa/n-002-query-plan.sh
   ```
3. Archive JSON output and compare actual costs, buffers, and asserted indexes to the prior approved artifact.

## Expected evidence and decision
- Plans use seeded account `00000000001`, seeded card `4859452612877065`, and report owner `USER0001`.
- Expected indexes are `cards_account_number_idx`, `transactions_card_id_idx`, and `reports_owner_idx`.
- **Pass:** fixture checks, index assertions, buffer evidence, and cost limit pass. **Fail:** a fixture/index/cost assertion fails or review finds a regression; do not promote.
