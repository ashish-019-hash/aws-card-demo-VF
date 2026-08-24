# CardDemo Express backend

CardDemo is an Express migration of the supplied CICS/COBOL workflows. PostgreSQL is the **only** runtime persistence store; startup never imports fixtures or modifies an empty database.

## Local PostgreSQL setup

```sh
cd express-backend
npm ci
npm run db:up
npm run migrate
npm run seed
npm start
```

`compose.yaml` pins PostgreSQL 16.8 Alpine and exposes a local development database at `postgresql://carddemo:carddemo_local_only@localhost:5432/carddemo`. `db:up` waits for database readiness. `reset` removes the local volume, starts a fresh server, then requires `migrate` and `seed` again. Migrations are ordered and rerunnable; seed is transactional and rerunnable.

Production requires `DATABASE_URL`. Set `DB_SSL=true` for TLS: certificate verification is enabled by default. `DB_SSL_CA` accepts a CA bundle (use `\n` escapes in environment configuration). `DB_SSL_REJECT_UNAUTHORIZED=false` is an explicit development-only opt-out and must not be used for production databases.

## Testing

Tests refuse to run against `DATABASE_URL`. Create an isolated database once, then supply a URL whose database name contains `test`:

```sh
npm run db:up
npm run test:db:create
TEST_DATABASE_URL=postgresql://carddemo:carddemo_local_only@localhost:5432/carddemo_test npm test
```

The test runner migrates the isolated database itself and resets/seeds it before each integration test. Run `npm run cleanup` from a scheduler to remove expired sessions and idempotency/report records older than 30 days; normal reads do not rewrite sessions or extend the fixed eight-hour expiry.

## Demo credentials

No portable ASCII `USRSEC` fixture exists. The seed therefore creates stable demo users only when absent:

| Role | User ID | Password | Name |
|---|---|---|---|
| Admin (`A`) | `ADMIN001` | `Admin123!` | Demo Administrator |
| Business (`U`) | `USER0001` | `User123!` | Demo Business User |

## Security and API rules

Success responses use `{ "data": ... }`; failures use `{ "error": { "code", "message", "details"? } }`. Cookies are signed, server-side, `HttpOnly`, `SameSite=Strict`, and `Secure` in production. Sign-in regenerates and explicitly saves the session. Each protected request verifies the stored user and role, so deletion and role changes revoke sessions. Password hashes and CVVs never leave the server. SSN, government ID, and EFT account ID are masked and read-only.

Roles are deliberately separate: `U` accesses business APIs and `A` accesses administrative APIs. Admins cannot delete themselves, the final administrator, or concurrently demote/delete all administrators. Mutable resources use quoted ETags and required `If-Match`. Cards default to seven rows and transactions/users to ten; limits above 100 and cursors not in the matching filtered result set return `400 INVALID_CURSOR`/`INVALID_LIMIT`.

Transaction and payment creation require an 8–128 visible-ASCII `Idempotency-Key`. Same target and canonical request body replay the original result; a changed target/body returns `409 IDEMPOTENCY_CONFLICT`. PostgreSQL transactions and row locks ensure full-balance payments atomically create exactly one payment transaction, zero the balance, and increment cycle credit.

## Behavioral parity and reports

`POST /api/transactions` follows `COTRN02C`: it writes only a transaction and never changes account balance/cycle totals. Full-balance billing follows `COBIL00C` and is the only online balance-changing command. `DATE` values, `timestamp(6)` values, leading-zero identifiers, blank processed timestamps, and fixed-width source values retain their original wire representation. API-created timestamps use `YYYY-MM-DD HH:MM:SS.ffffff` UTC text.

Reports finish synchronously. Custom is the default period (including a falsey period); monthly/yearly use UTC calendar dates. Rows select by `processedAt`, falling back to `originatedAt`, order by effective date then transaction ID, and remain visible only to the report owner.

## Source-to-endpoint mapping

| Legacy program | API |
|---|---|
| `COSGN00C` | `POST /api/auth/sign-in`, `POST /api/auth/sign-out`, `GET /api/auth/me` |
| `COMEN01C` / `COADM01C` | `GET /api/menu` |
| `COACTVWC` / `COACTUPC` | account and customer `GET/PATCH` |
| `COCRDLIC` / `COCRDSLC` / `COCRDUPC` | card list/detail/update |
| `COTRN00C` / `COTRN01C` / `COTRN02C` | transaction list/detail/create |
| `COBIL00C` | billing preview/full-balance payment |
| `CORPT00C` / `TRANREPT` | report creation/status/content |
| `COUSR00C`–`COUSR03C` | `/api/admin/users` CRUD |

## Import fidelity

`src/import-data.js` validates every nonblank source record width before parsing: account 300, card 150, card xref 36 meaningful bytes, customer 500, daily transaction 350, disclosure/category balance 50, and lookup 60. It preserves leading-zero IDs, CVV, SSN, government/EFT IDs, code fields, merchant IDs, dates, blank processed timestamps, and COBOL zoned-decimal overpunch (`{`–`I` positive and `}`–`R` negative). Seed updates source-owned rows without truncating sessions, idempotency data, reports, API-created users, or API-created transactions.

The complete machine-readable contract is in [`openapi.yaml`](openapi.yaml).
