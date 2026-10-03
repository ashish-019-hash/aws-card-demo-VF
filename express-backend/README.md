# CardDemo Express backend

A self-contained Express migration of the supplied CardDemo CICS/COBOL programs. It imports the fixed-width ASCII records into a JSON persistence file, so no external database service is required for local use or CI.

## Run and configuration

```sh
cd express-backend
npm ci
DATA_FILE="$(mktemp -u)/carddemo.json" npm run import
DATA_FILE="$(mktemp -u)/carddemo.json" npm start
npm test
```

`npm start` imports the source fixtures automatically when `DATA_FILE` does not exist. Copy `.env.example` to `.env` for local configuration (the process deliberately does not load `.env`; use your deployment's environment loader or export values). `SESSION_SECRET` must be a long random value in production. `TRUST_PROXY` configures Express's trusted proxy setting (`true`, a hop count, or a proxy subnet list) and must be set correctly when TLS terminates upstream so production secure cookies work. `DATA_FILE` defaults to `data/carddemo.json`, which is generated and gitignored.

The JSON store writes a same-directory temporary file and atomically renames it only after a successful logical mutation. It is **single-process only**: atomic rename prevents torn writes but does not coordinate multiple Node processes. Sessions expire lazily on access; normal GETs do not rewrite persistence. Mutations perform bounded cleanup (at most 100 records) of expired sessions and retained idempotency/report records older than 30 days; this is demo-store retention, not archival policy.

## Demo credentials

There is no supplied ASCII `USRSEC` input. The legacy tree does include an **EBCDIC** `USRSEC` file, but it is not a portable source of safely verified plaintext or password hashes. The importer therefore creates documented bcrypt demo users instead:

| Role | User ID | Password | Name |
|---|---|---|---|
| Admin (`A`) | `ADMIN001` | `Admin123!` | Demo Administrator |
| Business (`U`) | `USER0001` | `User123!` | Demo Business User |

Change or remove demo users before any shared deployment. New admin users require first and last names. Passwords use a modern minimum of eight characters rather than the legacy `PIC X(8)` screen field, while the user ID remains the source-compatible 3–8 character identifier.

## Security and API rules

Success responses use `{ "data": ... }`; failures use `{ "error": { "code", "message", "details"? } }`. Cookies are signed, server-side, `HttpOnly`, `SameSite=Strict`, and `Secure` in production; sign-in regenerates the session. Every protected request verifies that its session user still exists with the same role, so deletion or a role change revokes prior access. Password hashes and CVVs never leave the server. Customer SSN, government ID, and EFT account values are masked; government ID and EFT account ID are intentionally read-only because accepting a masked read-back value would corrupt the stored identifier. Internal record versions are not exposed; mutable resource reads supply an `ETag` for required `If-Match` updates.

Roles are deliberately strict: role `U` accesses business APIs only and role `A` accesses administrative user APIs only. Admins cannot delete themselves or the final `A` user. Transaction and payment creation require an 8–128 visible-ASCII `Idempotency-Key`. A key persists its target, canonical request fingerprint, and complete result: exactly the same request replays; a changed target or body returns `409 IDEMPOTENCY_CONFLICT`.

Pagination rejects invalid limits/cursors. Cards default to seven rows (the `COCRDLIC` screen); transactions and users default to ten rows (`COTRN00C`). Customer phones accept legacy-compatible digits and common `+(). -` punctuation up to 15 characters. State and country preserve source field widths (two and three characters respectively); this migration does not claim membership validation because the supplied source has no state/country lookup file.

## Behavioral parity and reports

`POST /api/transactions` follows `COTRN02C`: it **writes only a transaction** and does not change account balances or cycle totals, because that COBOL flow does no account `REWRITE`. `POST /api/billing/{accountId}/pay-full-balance` is the only online balance-changing command and follows `COBIL00C`; it resolves the payment card through the supplied xref, writes the payment, zeros balance, increments cycle credit, and returns the updated account and ETag.

Reports complete synchronously. A custom report needs real ordered `startDate`/`endDate`; monthly and yearly reports calculate the current UTC calendar period. Rows are sorted by effective date then transaction ID. Their effective date is `processedAt` when present, otherwise `originatedAt`; the fallback supports imported `dailytran` records whose processing timestamp field is blank. Content includes account and grand totals and is visible only to its creating `U` session.

## Source-to-endpoint mapping

| Legacy program | API |
|---|---|
| `COSGN00C` | `POST /api/auth/sign-in`, `POST /api/auth/sign-out`, `GET /api/auth/me` |
| `COMEN01C` / `COADM01C` | `GET /api/menu` |
| `COACTVWC` / `COACTUPC` | `GET/PATCH /api/accounts/{accountId}`, `GET/PATCH /api/accounts/{accountId}/customers/{customerId}` |
| `COCRDLIC` / `COCRDSLC` / `COCRDUPC` | `GET /api/cards`, `GET/PATCH /api/cards/{cardNumber}` |
| `COTRN00C` / `COTRN01C` / `COTRN02C` | `GET/POST /api/transactions`, `GET /api/transactions/{transactionId}` |
| lookup copybooks | `GET /api/lookup/transaction-types`, `GET /api/lookup/transaction-categories` |
| `COBIL00C` | `GET /api/billing/{accountId}/preview`, `POST /api/billing/{accountId}/pay-full-balance` |
| `CORPT00C` / `TRANREPT` | `POST /api/reports`, `GET /api/reports/{reportId}`, `GET /api/reports/{reportId}/content` |
| `COUSR00C`–`COUSR03C` | `/api/admin/users` CRUD |

## Import fidelity

`src/import-data.js` imports every supplied ASCII file: `acctdata`, `carddata`, `cardxref`, `custdata`, `dailytran`, `discgrp`, `tcatbal`, `trancatg`, and `trantype`, using `CVACT01Y`–`CVACT03Y`, `CVCUS01Y`/`CUSTREC`, and `CVTRA01Y`–`CVTRA06Y`. It decodes COBOL zoned decimal overpunch (`{`–`I` positive; `}`–`R` negative) and applies the copybook implied decimal scale. Lookup endpoints expose imported transaction types and categories.

The complete machine-readable contract, including all implemented paths, security, pagination, ETags, and statuses, is in [`openapi.yaml`](openapi.yaml).
