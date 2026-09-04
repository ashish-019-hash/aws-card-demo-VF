# CardDemo Backend

A Spring Boot / H2 modernization of the CardDemo user journeys. Controllers are thin REST adapters over `CardDemoApplicationService`; persistence entities never cross the HTTP boundary. Step 8 adds the requirements-traceable JUnit, API, workflow, seed, report, and OpenAPI verification suite.

- Requirements-to-tests matrix: [`docs/test-traceability.md`](docs/test-traceability.md)
- Deterministic local QA scenarios and access/reset steps: [`docs/manual-test-data.md`](docs/manual-test-data.md)
- Java: 21
- Build runtime: Docker with Maven 3.9.9 / Eclipse Temurin 21

## API summary

| Legacy/user-story capability | REST resource |
|---|---|
| Sign-on and role menu outcome (STORY-001) | `POST /api/session` |
| Standard/admin menus (STORY-002/003) | `GET /api/menu`, `GET /api/admin/menu` |
| Account inquiry/update (STORY-004/005) | `GET`, `PUT /api/accounts/{accountId}` |
| Card list/detail/update (STORY-006/007/008) | `GET /api/cards`, `GET`, `PUT /api/cards/{cardNumber}` |
| Transaction list/detail/add (STORY-009/010/011) | `GET`, `POST /api/transactions`, `GET /api/transactions/{transactionId}` |
| Full-balance bill payment (STORY-012) | `POST /api/accounts/{accountId}/payments` |
| Security-user list/add/update/delete (STORY-013–016) | `GET`, `POST /api/users`; `GET`, `PUT`, `DELETE /api/users/{userId}` |
| Report request and formatted lifecycle view (STORY-017/018) | `POST /api/reports/requests`, `GET /api/reports/transactions` |

List resources use Spring paging parameters: `page`, `size`, and `sort`. Card list accepts `accountId` and `cardNumber`; transaction list accepts `fromTransactionId`; user list accepts `startsWith`.

Request confirmation fields preserve the CICS decision gate: `Y` submits/executes, blank/`N` asks for confirmation, and another value is rejected. Payment uses the existing payment business rules to settle the full positive balance. Report requests use the monthly/yearly rules or supplied custom range and return date-filtered, card-sorted transactions.

## Validation coverage (Step 5)

Step 5 enforces the applicable `RULE-VAL-001`–`RULE-VAL-039` rules from `01.phase-1-output/validation-rules.md` at API/service boundaries, with persistence primary keys retaining user and transaction uniqueness. Errors use a stable JSON shape:

```json
{"code":"RULE-VAL-010","message":"ZIP prefix is not valid for the supplied state.","ruleId":"RULE-VAL-010","field":"addressZip"}
```

Coverage includes account/card identifiers and updates, legacy `Y`/`N` decision fields, monetary precision, CCYYMMDD/ISO calendar dates and strictly-past DOB, customer names/address/SSN/FICO/phone checks, the first-five-character ZIP scope and legacy state-prefix lookup, card expiry bounds, list filters/actions, required user/sign-on data and duplicate user key protection, transaction/account-or-card/amount/date/merchant validation, payment/report confirmation gates, and report custom-date presence. Inputs retain the legacy case behavior: data flags/statuses remain uppercase `Y`/`N`; confirmation and transaction selection accept either case.

The supplied general-menu administrator gate (`RULE-VAL-022`) is intentionally dormant because every configured option is standard-user (`U`). Transaction/report ISO `LocalDate` contracts reject malformed/non-calendar dates during JSON binding; duplicate transaction IDs are protected by the `TRAN_ID` primary key.

## Workflow integrity (Step 6)

`CardDemoApplicationService` is the transactional workflow boundary; controllers remain HTTP adapters only.

- **Account/customer update:** account and customer records carry optimistic versions. `GET /api/accounts/{accountId}` returns the account and linked customer versions; `PUT` must supply `expectedAccountVersion` and, when `customer` is changed, `expectedCustomerVersion`. Missing or stale versions return `409 STALE_WRITE`. Both rewrites are flushed in one transaction, so a write failure rolls back the entire update.
- **Transactions and payments:** transaction creation verifies the resolved account/card and type/category relationships before one atomic insert. A locked `TRAN_ID_ALLOCATION` row replaces max-plus-one selection, retaining 16-digit zero-padded monotonic IDs while preventing duplicate allocation. A confirmed payment inserts `BILL PAYMENT - ONLINE` and updates the balance in the same transaction.
- **Security users:** create checks the normalized user key and converts persistence uniqueness conflicts into `409 DUPLICATE_USER`; update and delete retain their explicit workflow service methods.
- **Reports:** confirmed report requests are stored as `REPORT_REQUEST` records with `SUBMITTED` state, criteria, and submission time. Retrieve their state and date-filtered/card-sorted output with `GET /api/reports/requests/{requestId}`. The existing `GET /api/reports/transactions` remains an ad-hoc period output view.

The integration workflow suite covers monotonic ID allocation, relationship failure integrity, stale snapshot rejection, payment rollback, atomic payment persistence, and persisted report retrieval.

## Build and test

Prerequisites: Docker. From this directory run:

```bash
docker run --rm -v "$PWD":/workspace -w /workspace maven:3.9.9-eclipse-temurin-21 mvn clean verify
```

## Run locally

First build and execute all checks:

```bash
docker run --rm -v "$PWD":/workspace -w /workspace maven:3.9.9-eclipse-temurin-21 mvn clean verify
```

Then start the development server:

```bash
docker run --rm -p 8080:8080 -v "$PWD":/workspace -w /workspace maven:3.9.9-eclipse-temurin-21 mvn spring-boot:run
```

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI document: <http://localhost:8080/v3/api-docs>
- H2 console (only when explicitly enabled): <http://localhost:8080/h2-console>

H2 uses `jdbc:h2:mem:carddemo`, user `sa`, and an empty password.

## Database (Step 7)

The development profile uses a named, in-memory H2 database and an explicit `schema.sql`. Hibernate runs in `validate` mode, so entity mappings must match that schema; application startup does not generate, alter, or drop tables.

| Setting | Value |
|---|---|
| JDBC URL | `jdbc:h2:mem:carddemo;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE` |
| User | `sa` |
| Password | empty |
| Console (only when explicitly enabled) | <http://localhost:8080/h2-console> |

The H2 console is disabled by default, including in the `dev` profile. For an intentional local administration session, start the app with `--carddemo.h2-console.enabled=true`, authenticate as an administrator through the API, then open the console and enter the JDBC URL above, user `sa`, and an empty password. It remains administrator-protected and is intended only for local development.

## Manual API smoke test

After starting the app, use the seeded administrator to authenticate and inspect the OpenAPI contract:

```bash
# Sign on and retain the rotated session cookie. Sign-on is the only CSRF-exempt mutation.
curl -sS -c cookies.txt -X POST http://localhost:8080/api/session \
  -H 'Content-Type: application/json' \
  -d '{"userId":"ADMIN001","password":"ADMIN123"}'

# Obtain the CSRF cookie, then send both cookies for authenticated calls.
curl -sS -b cookies.txt -c cookies.txt http://localhost:8080/api/csrf
TOKEN=$(awk '$6 == "XSRF-TOKEN" {print $7}' cookies.txt)
curl -sS -b cookies.txt http://localhost:8080/api/accounts/1
curl -sS http://localhost:8080/v3/api-docs > openapi.json

# State-changing calls include the CSRF header; this example ends the session.
curl -sS -b cookies.txt -X POST http://localhost:8080/api/session/logout \
  -H "X-XSRF-TOKEN: $TOKEN" -o /dev/null -w '%{http_code}\n'
```

The legacy seed includes account `1`, card `0500024453765740`, 300 transactions, transaction type/category configuration, and these development users:

| User ID | Password | Role |
|---|---|---|
| `ADMIN001` | `ADMIN123` | Administrator (`A`) |
| `USER0001` | `USER123` | Standard user (`U`) |

Do not use these credentials outside local development.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| `docker: command not found` or daemon unavailable | Install/start Docker, then rerun the documented Docker command. The project requires Java 21; do not substitute an older host JDK. |
| Port `8080` is already allocated | Stop the process using the port, or change the host mapping, for example `-p 8081:8080`, and browse `http://localhost:8081`. |
| H2 console has no records | Open the console while the same running app is alive and use the exact JDBC URL above. The database is in memory and vanishes when that app stops. |
| Manual changes make results hard to reproduce | Restart the app or start it with `--carddemo.database.reset=true` to reload the immutable bundled extracts. |
| A transaction report has no rows | Reports select transactions by the leading `YYYY-MM-DD` date in `TRAN_PROC_TS`. Blank processing timestamps are intentionally excluded; create a confirmed transaction/payment with a date inside the requested period. |
| Maven test failure report is needed | Inspect `target/surefire-reports/` after `mvn clean verify`; rerun a focused test with `mvn -Dtest=ApiContractIntegrationTest test` inside the same Docker image. |

### Schema and legacy seed data

`schema.sql` defines the normalized persistence tables for the ten catalog entities (`ACCTDAT`, `CUSTDAT`, `CARDDAT`, `CCXREF`, `TRANSACT`, `TRANTYPE`, `TRANCATG`, `TCATBALF`, `DISCGRP`, and `USRSEC`), plus workflow support tables (`TRAN_ID_ALLOCATION`, `REPORT_REQUEST`). It includes the documented primary/composite keys, foreign keys, and lookup/report indexes.

The application bundles exact copies of the supplied ASCII data in `src/main/resources/legacy-data/`; it never changes the source extracts. `LegacyDatabaseInitializer` parses their fixed-width columns and COBOL overpunch amounts rather than reformatting them. The default seed contains 50 accounts/customers/cards/assignments/category balances, 300 transactions, 7 types, 18 categories, 51 disclosure rates, and two development users:

| User ID | Password | Role |
|---|---|---|
| `ADMIN001` | `ADMIN123` | Administrator (`A`) |
| `USER0001` | `USER123` | Standard user (`U`) |

The sample records exercise account/card inquiry, transaction browsing/reporting, transaction creation configuration (including `01/0001`), bill payment configuration (`02/0002`), user administration, and report requests. Legacy timestamp fields remain `VARCHAR(26)`: full timestamps, date-only values, and blank processing values are therefore retained verbatim.

### Reset and reseed

The seed loads once into an empty named database. For a deterministic clean baseline on every startup, pass:

```bash
--carddemo.database.reset=true
```

For example, locally:

```bash
docker run --rm -p 8080:8080 -v "$PWD":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 mvn spring-boot:run \
  -Dspring-boot.run.arguments="--carddemo.database.reset=true"
```

Stop/restart the in-memory app to start a new database, or use the reset flag above while it remains running. The reset clears modern H2 tables in foreign-key dependency order and reloads the immutable bundled extracts.

### Database verification

The focused initialization suite verifies schema initialization, record counts, fixed-width decimal/timestamp representations, foreign-key joins, transaction allocation, and reseeding:

```bash
docker run --rm -v "$PWD":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 mvn -Dtest=LegacyDatabaseInitializationTests test
```

## Security, sessions, and browser CSRF

Production runs use server-side authenticated sessions. `POST /api/session` rotates the session ID on successful sign-on. All business/PII resources require that session; `/api/users/**`, `/api/admin/**`, and the optional H2 console also require an administrator session. End a session with `POST /api/session/logout`.

Browser mutations use Spring Security's cookie-to-header CSRF mechanism. First obtain the `XSRF-TOKEN` cookie, then send its value in `X-XSRF-TOKEN` together with the `JSESSIONID` cookie. The sign-on endpoint is deliberately exempt only so a new session can be established.

```bash
# Sign on and retain JSESSIONID (the response rotates it); the sign-on call needs no CSRF token.
curl -sS -c cookies.txt -X POST http://localhost:8080/api/session \
  -H 'Content-Type: application/json' \
  -d '{"userId":"ADMIN001","password":"ADMIN123"}'

# Fetch the CSRF cookie, then use it for state-changing calls.
curl -sS -b cookies.txt -c cookies.txt http://localhost:8080/api/csrf
TOKEN=$(awk '$6 == "XSRF-TOKEN" {print $7}' cookies.txt)
curl -sS -b cookies.txt -X POST http://localhost:8080/api/session/logout \
  -H "X-XSRF-TOKEN: $TOKEN" -o /dev/null -w '%{http_code}\n'
```

The H2 console is disabled by default, including the default `dev` profile. It may be enabled only for an intentional local administration session by adding `--carddemo.h2-console.enabled=true`; it remains administrator-protected.

### Browse and seed caveats

`fromTransactionId` is a 1–16 digit numeric lower bound and is zero-padded to the fixed-width 16-digit legacy key before browsing. `accountId=0` on card browse means no account filter. User `startsWith` uses normalized uppercase prefix matching. Fixed-width seed data is preserved verbatim where the legacy extract has blank/date-only timestamps; report selection intentionally uses the processing timestamp's leading date and excludes blank values.
