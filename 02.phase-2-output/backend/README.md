# CardDemo Backend

Spring Boot 3.3 / Java 21 REST backend for the CardDemo modernization, migrated from the
COBOL/CICS "CardDemo" application (`00.phase-1-input/`) per the phase-1 discovery outputs
(`01.phase-1-output/business-entities.md`, `business-rules-catalog.md`, `validation-rules.md`,
`screen-flow.md`, `user-stories.md`).

## Prerequisites

- Java 21
- Maven (wrapper not included; use a locally installed `mvn`)
- Docker (for local Postgres via `docker-compose.yml`, and for Testcontainers-backed
  integration tests)

## Running locally

```bash
# 1. Start Postgres
cd 02.phase-2-output
docker compose up -d

# 2. Run the app (dev profile enables sample-data seeding)
cd backend
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

The app listens on **port 8080**. Swagger UI: http://localhost:8080/swagger-ui.html
(OpenAPI JSON at `/v3/api-docs`).

### Seed credentials (dev profile only)

The `dev` profile seeds the legacy sample dataset (`src/main/resources/seed-data/`, taken
from `00.phase-1-input/data/ASCII/*.txt`) plus two users:

| User ID  | Password | Role          |
|----------|----------|---------------|
| ADMIN001 | PASSWORD | Admin (`A`)   |
| USER0001 | PASSWORD | Regular (`U`) |

Seeding is controlled by `carddemo.seed.enabled` (also settable via env var
`CARDDEMO_SEED_ENABLED`) and is idempotent — each table loads only if empty. It is `false`
by default and `true` in `application-dev.yml`.

## Configuration

| Property / Env var | Default | Purpose |
|---|---|---|
| `spring.datasource.url/username/password` | `jdbc:postgresql://localhost:5432/carddemo` / `carddemo` / `carddemo` | Postgres connection |
| `carddemo.seed.enabled` (`CARDDEMO_SEED_ENABLED`) | `false` (`true` in `dev`) | Load legacy sample data + seed users on startup |
| `carddemo.security.csrf-cookie-secure` | `true` (`false` in `dev`) | `Secure` flag on the `XSRF-TOKEN` cookie; `false` needed for plain-HTTP local dev |
| `carddemo.cors.allowed-origins` | `http://localhost:5173` | CORS allow-list (credentials enabled) for the React dev server |
| `server.port` | `8080` | HTTP port |

Profiles: `dev` (local development, `application-dev.yml`) and `test` (integration tests,
`application-test.yml`, used automatically by `ApplicationIntegrationTest` via
`@ActiveProfiles("test")`).

## Authentication

Session-based auth (`POST /api/session` with `{"userId","password"}`) sets a `JSESSIONID`
cookie and forces issuance of a CSRF cookie (`XSRF-TOKEN`). All subsequent
state-changing requests (`POST`/`PUT`/`DELETE`, except the login call itself) must echo the
`XSRF-TOKEN` cookie value back in the `X-XSRF-TOKEN` header. `/api/users/**` is restricted
to `ROLE_ADMIN` (`sec_usr_type = 'A'`).

## API surface

| Method | Path | Notes |
|---|---|---|
| POST | `/api/session` | Sign on (COSGN00C) |
| GET | `/api/session` | Current session status |
| DELETE | `/api/session` | Sign off |
| GET | `/api/menu` | Menu options for the signed-in user's role (COMEN01C/COADM01C) |
| GET | `/api/accounts/{id}` | Account view (COACTVWC) |
| PUT | `/api/accounts/{id}` | Account update, optimistic-concurrency (COACTUPC, BR-006/007/008) |
| GET | `/api/cards?acctId=&cardNum=&page=` | Card list, filterable/paginated (COCRDLIC) |
| GET | `/api/cards/{cardNumber}` | Card view (COCRDSLC) |
| PUT | `/api/cards/{cardNumber}` | Card update, optimistic-concurrency (COCRDUPC, BR-009) |
| GET | `/api/transactions?startId=&page=` | Transaction list, paginated (COTRN00C) |
| GET | `/api/transactions/last?cardNum=` | "Copy last transaction" (COTRN02C F5) |
| GET | `/api/transactions/{id}` | Transaction view (COTRN01C) |
| POST | `/api/transactions` | Add transaction, requires `confirm:"Y"` (COTRN02C, BR-010) |
| POST | `/api/bill-payments` | Pay full balance, requires `confirm:"Y"` (COBIL00C, BR-011/012) |
| POST | `/api/reports` | Submit transaction report (monthly/yearly/custom), requires `confirm:"Y"` (CORPT00C, BR-013) |
| GET | `/api/users?page=` | List users, admin-only (COUSR00C) |
| GET | `/api/users/{userId}` | Get user, admin-only (COUSR02C) |
| POST | `/api/users` | Create user, admin-only (COUSR01C, BR-016) |
| PUT | `/api/users/{userId}` | Update user, admin-only (COUSR02C, BR-016 no-op guard) |
| DELETE | `/api/users/{userId}` | Delete user, admin-only (COUSR03C) |

## Tests

```bash
mvn test      # unit + integration tests (Testcontainers spins up postgres:16-alpine)
mvn verify    # full build lifecycle
```

As of this writing: **134 tests**, all passing (118 unit tests across validation/service
layers + 16 `@SpringBootTest`/Testcontainers integration tests in
`ApplicationIntegrationTest` covering sign-on, account view, transaction-add id
allocation, bill payment, report submission, admin-only user management, and three
genuine-concurrency scenarios: concurrent transaction-id allocation, concurrent account
update conflict, and concurrent duplicate user creation).

### Troubleshooting

- **Testcontainers: `Could not find a valid Docker environment` / docker-java `BadRequestException:
  client version 1.32 is too old`** — the bundled `docker-java` client negotiates down to an
  old Docker API version that newer Docker daemons reject. Fixed by pinning
  `src/test/resources/docker-java.properties` (`api.version=1.44`); setting the
  `DOCKER_API_VERSION` env var alone does **not** work around this.
- **`Schema-validation: wrong column type` / `missing column` on `@SpringBootTest` startup** —
  `spring.jpa.hibernate.ddl-auto=validate` means every entity's declared column name/type must
  exactly match `db/migration/V1__schema.sql`. If you add a field to an `@Entity` or
  `@Embeddable`, add an explicit `@Column(name = "...")` — Hibernate's default snake_case
  derivation frequently does not match this schema's legacy `xxx_yyy_zzz`-prefixed column names.
- **`TestRestTemplate` POST that gets a 401 response throws `java.net.HttpRetryException:
  cannot retry due to server authentication, in streaming mode`** — this is a JDK
  `HttpURLConnection` bug when a POST body is combined with a 401 response. Fixed by adding
  `org.apache.httpcomponents.client5:httpclient5` (test scope) so Spring Boot autoconfigures
  `TestRestTemplate`/`RestTemplateBuilder` to use Apache HttpClient instead of the JDK's client.
- **`transactions` insert fails with `foreign key constraint "transactions_type_fkey"` under
  the `test` profile** — `V2__transaction_reference_fks.sql` added FK constraints from
  `transactions` to the `transaction_types`/`transaction_categories` reference/master tables.
  In `dev`, `SeedDataLoader` (profile-gated) loads those tables from
  `seed-data/trantype.txt`/`trancatg.txt`; the `test` profile never runs that loader
  (`carddemo.seed.enabled=false`), so `ApplicationIntegrationTest` seeds the one type/category
  row its own tests write (`"02"`/`2`) directly via `ensureTransactionReferenceData()`.

## Known gaps / documented legacy quirks (carried forward, not silently "fixed")

- **BR-001** — sign-on compares the typed password upper-cased against the stored value
  as-is; a lowercase-stored password can never match even with an exact-case-matching typed
  password. Preserved intentionally (regression-tested in `SignOnServiceTest`).
- **BR-003** — the legacy admin-menu-option dead-code gate (unreachable branch) is preserved,
  not removed (see `MenuServiceTest`).
- **BR-005** — no account-ownership scoping: any authenticated user (any role) can view/update
  any account by ID, exactly as the legacy screens allow.
- **BR-007 / BR-009** — account-update and card-update conflict handling is intentionally
  asymmetric with the legacy screen-state refresh behavior; documented in
  `AccountService`/`CardService` Javadoc.
- **VR-001–VR-004** (sign-on mandatory fields, menu option validity) are not implemented as
  distinct rules in this REST API: VR-001/002 are subsumed by standard credential validation
  in `SignOnService`, and VR-003/004 (menu option selection validity) do not apply to a menu
  that is a `GET` returning role-scoped options rather than a typed numeric selection.
- CBTRN03C (nightly batch posting) and online CICS maintenance for `TRANTYPE`/`TRANCATG`/
  `TCATBALF`/`DISCGRP` reference tables were out of scope for this REST migration (no
  corresponding legacy online screens existed for the latter four).

## Backend deviations from legacy behavior (deliberate modernization decisions)

Unlike "Known gaps" above (legacy quirks preserved as-is), these are cases where this
backend intentionally enforces something the legacy COBOL did not:

- **VR-REF-001 / VR-REF-002 (add transaction `typeCd`/`catCd` referential integrity).**
  COTRN02C.cbl only checks that `typeCd`/`catCd` are numeric (VR-086/VR-076); it never
  verifies the pair exists in `TRANTYPE`/`TRANCATG` before writing a transaction record —
  a numerically-valid but nonexistent combination (e.g. type `02` category `5`) would have
  been silently written by the legacy system. `V2__transaction_reference_fks.sql` added real
  FK constraints (`transactions_type_fkey`, `transactions_category_fkey`) for referential
  integrity, so `TransactionService.addTransaction` now checks
  `TransactionTypeRepository`/`TransactionCategoryRepository` existence *before* allocating a
  transaction id and rejects an unknown combination as `400 VALIDATION_FAILED`
  (`tranTypeCd`/`VR-REF-001` or `tranCatCd`/`VR-REF-002`) instead of letting it hit the FK
  constraint at flush time and surface as a `500`. These two rule ids are new — deliberately
  outside the `VR-001`..`VR-128` range from `01.phase-1-output/validation-rules.md` — to mark
  them as modernization rules with no legacy counterpart, not omissions from that catalog.
- **Generic `DataIntegrityViolationException` → 409 safety net.** Any other DB-level FK or
  unique-constraint violation that reaches the controller layer without a prior service-level
  check (an unanticipated case) is mapped by `GlobalExceptionHandler` to `409 CONFLICT` with a
  non-technical message, so no such violation can ever surface to a caller as a raw `500`.


## Behavioral equivalence

`docs/behavioral-equivalence.md` places each non-trivial COBOL calculation or decision
(transaction id allocation, bill payment record contents and balance update, report period
derivation, optimistic-concurrency messages, sign-on routing) side by side with the Java
implementation and states how the equivalence was verified (unit, integration, E2E, manual).
