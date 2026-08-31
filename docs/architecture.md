# Architecture and folder structure

CardDemo replaces the COBOL/CICS presentation flow with a versioned NestJS API, PostgreSQL persistence, a fixed-width import CLI, and a separate report worker. The original source evidence remains unchanged under `00.phase-1-input/`.

## Runtime topology

```text
HTTP client
   |
   v
NestJS API (/api/v1, /docs, /docs-json)
   |                 \
   |                  \--- PostgreSQL 17
   |                              ^
   |                              |
   +--- report worker -------------+
   |
   +--- legacy-import CLI --- EBCDIC CP037 canonical data
                            ASCII partial mirror verification
```

The API, migration job, and worker use the same database configuration. Compose starts PostgreSQL, waits for it to become healthy, runs migrations once, then starts the API and worker. It does not import legacy data automatically. The `seed-dev` tool is a separate, development-only application context—not an API module—and requires a non-production environment plus `SEED_ALLOW_UNSAFE=true` before it bootstraps database access. The container image deliberately excludes the immutable source tree; run the host-side importer command against a host-reachable database after the Compose stack is ready. Changing `POSTGRES_PASSWORD` does not change an initialized PostgreSQL volume; reset only disposable local volumes.

## Source layout

```text
.
├── 00.phase-1-input/                 # immutable COBOL/CICS source, copybooks, CSD, and fixtures
│   ├── cbl/                          # COBOL programs
│   ├── cpy/                          # data layouts and validation lookup copybooks
│   ├── data/EBCDIC/                  # canonical fixed-width CP037 source
│   └── data/ASCII/                   # incomplete mirror only
├── docs/
│   ├── architecture.md               # this document
│   └── migration/
│       ├── legacy-contract.md        # source evidence and frozen migration decisions
│       ├── parity-boundaries.md      # explicit behavior/parity limits
│       └── source-divergences.md     # reviewed ASCII mirror allow-list
├── scripts/
│   ├── generate-legacy-validation-lookups.py
│   └── verify-legacy-contract.py
├── src/
│   ├── main.ts                       # API bootstrap
│   ├── app.module.ts                 # production API root module and correlation middleware
│   ├── seed-app.module.ts            # isolated development seed application context
│   ├── worker.ts                     # report-worker application context
│   ├── cli/
│   │   ├── legacy-import.ts          # target standalone canonical/mirror importer
│   │   └── seed-dev.ts               # explicit-opt-in development admin seed
│   ├── common/
│   │   ├── concurrency/              # expected-version helpers
│   │   ├── cursor/                   # signed forward/backward keyset cursors
│   │   ├── errors/                   # RFC 9457 problem responses
│   │   ├── logging/                  # correlation IDs and redaction support
│   │   └── validation/               # exact scalar validators and generated legacy lookups
│   ├── config/                       # environment parsing, validation, typed configuration
│   ├── database/
│   │   ├── data-source.ts            # TypeORM CLI data source
│   │   ├── database.module.ts        # runtime TypeORM integration
│   │   ├── pg-type-parsers.ts        # exact text parsers for date/time/numeric OIDs
│   │   ├── run-migrations.ts         # Compose one-shot migration entry point
│   │   └── migrations/               # reversible schema migrations
│   └── modules/
│       ├── auth/                     # login, JWT/current-user, authorization guards
│       ├── users/                    # admin user CRUD
│       ├── customers/                # customer read/update ownership
│       ├── accounts/                 # joined account/customer read and atomic patch
│       ├── cards/                    # card list/detail/versioned patch
│       ├── transactions/             # transaction read/create and SQL ID allocation
│       ├── payments/                 # atomic, version-aware bill payment
│       ├── reports/                  # report jobs, artifact download, worker processing
│       ├── legacy-import/            # layouts, decoders, parsers, validators, reconciliation
│       ├── development-seed/         # isolated synthetic DEVADMIN seed service
│       └── health/                   # liveness and database readiness
├── test/
│   ├── fixtures/legacy/              # fixture manifest: hashes, counts, and widths
│   ├── fixtures/synthetic/           # non-canonical multi-card payment test input
│   ├── unit/                         # target isolated contract tests
│   ├── integration/                  # target database/import tests
│   └── e2e/                          # target API/worker workflow tests
├── .env.example                      # host-side local configuration template
├── compose.yaml                      # PostgreSQL, migration job, API, and report worker
├── Dockerfile                        # Node 24 build/runtime images
└── Makefile                          # local Docker and verification targets
```

The current source tree and Swagger document are authoritative for availability. Auth/users, account/customer/card/transaction/payment, reports, health, importer, and isolated development-seed paths are present. Planned parity and end-to-end verification work remains outside this topology statement.

## Ownership and boundaries

| Area                             | Owns                                                                                                   | Must not do                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `common`                         | Cross-cutting API contracts: errors, cursors, exact validation, correlation, optimistic version checks | Depend on a domain module or encode legacy import layouts.                                          |
| `config`                         | Environment validation and typed config such as report timestamp mode                                  | Contain persistence or request business logic.                                                      |
| `database`                       | TypeORM setup, exact PostgreSQL type parsing, schema migration lifecycle                               | Auto-synchronize schema or convert precision-sensitive fields to JS `Date`/`number`.                |
| `auth` / `users`                 | Password verification, JWT/auth guards, admin user behavior                                            | Uppercase passwords; passwords remain exact-case input.                                             |
| `customers`, `accounts`, `cards` | Domain read/write contracts and API-only legacy-derived validation                                     | Reject an untouched imported anomaly on an unrelated patch.                                         |
| `transactions`                   | Read/create behavior and bounded SQL 16-digit ID allocation                                            | Allocate IDs with application-side `MAX + 1`.                                                       |
| `payments`                       | One transactional bill-payment unit and lowest-card selection                                          | Split account update and transaction insert across transactions.                                    |
| `reports` / `worker`             | Job requests, deterministic queue claim, artifact storage/rendering                                    | Change an existing job's stored timestamp mode during retry.                                        |
| `legacy-import` / `cli`          | Byte slicing, CP037 decode, source validation, canonical import, ASCII reconciliation                  | Treat ASCII as canonical, create missing users, or apply stricter API validation to source records. |
| `00.phase-1-input`               | Immutable source evidence                                                                              | Receive generated outputs, formatting, or edits.                                                    |

## API and persistence conventions

- APIs are under `/api/v1`; Swagger is `/docs` and `/docs-json`.
- Database `date`, `timestamp`, `timestamptz`, and `numeric` values cross the Node boundary as strings. Domain serializers and validators preserve exact wire formats.
- Pagination uses opaque signed cursors. The default limit is 10 and the maximum is 100.
- Versioned mutable resources require caller-provided `expectedVersion`; stale updates are `409 VERSION_CONFLICT` with no mutation.
- Canonical import accepts structural source validity. API writes add stricter business validation only to fields being written.
- PostgreSQL schema changes run only through migrations; migrations have development downs, which are destructive.

## Data authority

The EBCDIC CP037 files in `00.phase-1-input/data/EBCDIC/` are canonical. Import parsing slices fixed-width **bytes before decoding**. ASCII files are an incomplete mirror used only for explicit mirror verification or labeled partial import. The precise status and divergence rules are in [migration/parity-boundaries.md](migration/parity-boundaries.md) and [migration/source-divergences.md](migration/source-divergences.md).
