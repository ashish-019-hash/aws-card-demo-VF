# CardDemo NestJS migration

CardDemo is a staged migration of the immutable COBOL/CICS demo in [`00.phase-1-input/`](00.phase-1-input/) to a NestJS 11 API, PostgreSQL 17, and an asynchronous report worker. The legacy directory is source evidence, not application code: do not edit, regenerate, or delete it.

> **Current implementation status:** the runtime, PostgreSQL schema migrations, health endpoints, shared validation/cursor/concurrency primitives, legacy importer, login/admin-user API, report job API/worker, report formatter, fixture manifest, and migration evidence are present. Account/customer/card/transaction/payment APIs, complete OpenAPI coverage, and full end-to-end verification are still in progress. This README distinguishes commands available now from the approved final contracts; do not substitute ASCII data or invent credentials.

## Architecture

```text
Client / API consumer
        |
        v
NestJS API (HTTP, /api/v1) ---- PostgreSQL 17
        |                            ^
        |                            |
        +--- report worker -----------+
        |
        +--- legacy-import CLI ---- 00.phase-1-input/data/EBCDIC (canonical)
                                  \- data/ASCII (partial mirror only)
```

- **API:** NestJS applies URI versioning, global validation, RFC 9457 problem responses, correlation IDs, UTC process handling, CORS, Swagger, and graceful shutdown.
- **Database:** TypeORM migrations create PostgreSQL tables and indexes. `synchronize` is not used. PostgreSQL date, timestamp, timestamptz, and numeric parsers return strings so dates, microseconds, decimals, and leading zeroes do not pass through JavaScript `Date` or floating point.
- **Worker:** the report worker runs as a separate application context and will claim and render report jobs after the reports module is implemented.
- **Import:** the approved importer reads fixed-width bytes, then decodes CP037. EBCDIC is authoritative; ASCII is only a labeled partial mirror verification/import mode.

Read [docs/architecture.md](docs/architecture.md) for module ownership and the target folder layout. Read [docs/migration/parity-boundaries.md](docs/migration/parity-boundaries.md) before changing import, validation, dates, or report behavior.

## Prerequisites

The Docker workflow requires no host Node.js or PostgreSQL installation.

1. Docker Engine with Docker Compose v2. Verify it:

   ```bash
   docker --version
   docker compose version
   ```

2. Git and a checkout of this branch:

   ```bash
   git clone https://github.com/ashish-019-hash/aws-card-demo-VF.git
   cd aws-card-demo-VF
   git checkout vorflux/migrate-cobol-to-nestjs
   ```

3. Optional, for host-side linting, unit tests, or development mode: Node.js **24 LTS** and npm **11 or later**. Verify versions:

   ```bash
   node --version
   npm --version
   ```

   The project declares `node >=24 <25` and `npm >=11`. Run `npm ci` only when using host-side commands.

## Configuration and credentials

### Local `.env` for host-side commands

Create a local file from the checked-in template. `.env` is ignored by Git.

```bash
cp .env.example .env
```

Set unique, random development secrets before running the API outside Docker:

```bash
CURSOR_SECRET="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
printf 'CURSOR_SECRET=%s\nJWT_SECRET=%s\n' "$CURSOR_SECRET" "$JWT_SECRET"
```

Copy those two output lines into `.env`. `CURSOR_SECRET` and `JWT_SECRET` must each be at least 32 characters and must differ. Do not commit real secrets or use the example placeholder values outside disposable local development.

The required configuration is:

| Variable                | Local development value / format                                                   | Purpose                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `development`, `test`, or `production`                                             | Runtime mode.                                                                                                                                  |
| `PORT`                  | `3000` by default                                                                  | API listening port.                                                                                                                            |
| `DATABASE_URL`          | `postgresql://carddemo:carddemo@localhost:5432/carddemo`                           | PostgreSQL connection URL. Required by startup validation.                                                                                     |
| `DATABASE_SSL`          | `false` locally; `true` only when the server requires TLS                          | PostgreSQL TLS toggle.                                                                                                                         |
| `CORS_ORIGINS`          | comma-separated origins, for example `http://localhost:3000,http://localhost:4200` | Allowed browser origins.                                                                                                                       |
| `CURSOR_SECRET`         | unique random string, 32+ characters                                               | Signs opaque pagination cursors.                                                                                                               |
| `JWT_SECRET`            | a different unique random string, 32+ characters                                   | Signs API JWTs once auth is implemented.                                                                                                       |
| `REPORT_TIMESTAMP_MODE` | `processed-or-original` (default) or `processed`                                   | Captured on new report jobs. The former uses `COALESCE(processed_ts, original_ts)`; the latter excludes transactions with null `processed_ts`. |
| `LOG_LEVEL`             | `error`, `warn`, `log`, `debug`, or `verbose`                                      | NestJS log threshold.                                                                                                                          |

The committed `compose.yaml` intentionally uses disposable local Docker credentials (`carddemo` / `carddemo`) and service-local `postgres`. They are not production credentials. Its service settings are self-contained and do **not** read `.env`; use `.env` for host-side `npm`/TypeORM commands. The current image excludes `00.phase-1-input/`, so run the importer through the host-side Make targets below; do not try to point the running API container at a legacy source directory it does not contain.

### Database credentials in Docker

For the default local stack only:

```text
host:     localhost
port:     5432
database: carddemo
user:     carddemo
password: carddemo
```

Use a different password, non-default secrets, restricted network access, and managed secret storage for every non-local environment.

### Login credentials

No demo password is documented or fabricated. In the approved final workflow, `make import-ebcdic` reads canonical `USRSEC`, preserves the decoded password's exact case only long enough to bcrypt-hash it, and discards the plaintext. Log in with the original imported user ID and its exact-case legacy password only if you are authorized to possess that source credential. Passwords are never uppercased, logged, returned, or available through ASCII mode.

## Quick start: current runnable scaffold

From the repository root:

```bash
# Build the images, start PostgreSQL, run migrations, then start API and worker.
make up

# Wait until the API and database are ready.
until curl --fail --silent http://localhost:3000/api/v1/health/ready; do sleep 2; done
echo

# Liveness does not query PostgreSQL; readiness does.
curl --fail --silent http://localhost:3000/api/v1/health/live; echo
curl --fail --silent http://localhost:3000/api/v1/health/ready; echo
```

Expected responses are:

```json
{ "status": "ok" }
```

and:

```json
{ "status": "ok", "database": "ok" }
```

Swagger is served at <http://localhost:3000/docs> and its JSON is at <http://localhost:3000/docs-json>. At the scaffold stage Swagger exposes only routes implemented in source; it must not be treated as evidence that planned domain routes exist.

Useful Docker operations:

```bash
# View service state and follow one service's logs.
docker compose ps
docker compose logs --follow api

# Re-run migrations after starting the database.
make migrate

# Stop containers but keep the PostgreSQL volume/data.
make down
```

## Import and application workflow

The importer is available now as a host-side npm command. `make import-ebcdic` uses the canonical data root and runs `npm run legacy-import`; it therefore needs a host Node 24/npm 11 installation, dependencies from `npm ci`, and a host-reachable `DATABASE_URL` in `.env`. Start PostgreSQL with Compose first, then import from the repository root:

```bash
npm ci
cp .env.example .env
# Replace the two example secrets in .env with distinct 32+ character values.

make reset
make up
make import-ebcdic
```

The target command is exactly:

```bash
npm run legacy-import -- \
  --mode=canonical-ebcdic \
  --source-path=00.phase-1-input/data
```

For machine-readable output and an explicit completeness assertion, use the direct command:

```bash
npm run legacy-import -- \
  --mode=canonical-ebcdic \
  --source-path=00.phase-1-input/data \
  --strict-completeness \
  --json
```

Canonical import requirements:

1. Read and validate every raw fixed-width CP037 record before database writes.
2. Write dependency-ordered upserts in one transaction and deduplicate the two byte-identical EBCDIC account exports by SHA-256.
3. Preserve structurally valid legacy anomalies, including FICO values from `000` through `999`, unusual `address_zip` / `group_id` text, and nullable `processed_ts`.
4. Reconcile hashes, record counts, references, ID ranges, decimal totals, null processed timestamps, warnings, and transaction sequence state.
5. Record a complete canonical import run. EBCDIC is the value retained for every source disagreement.

Run the ASCII mirror check separately, after canonical import. The current `make import-ascii` command uses the ASCII source root but creates a labeled partial import when no canonical run exists. After canonical completion, use `--verify-only` so the command performs comparison only:

```bash
# ASCII is never a replacement for canonical import.
npm run legacy-import -- \
  --mode=ascii-mirror \
  --source-path=00.phase-1-input/data \
  --verify-only \
  --json
```

ASCII mode is explicitly **partial**: no ASCII user dataset exists, so it reports missing users, never creates credentials, and cannot claim a complete runnable migration. It normalizes only the known missing 14-byte `CARDXREF` filler and allows only the reviewed differences in [source-divergences.md](docs/migration/source-divergences.md). Any additional difference fails verification until reviewed and documented.

Available API contracts are `/api/v1/auth/login`, admin-only `/api/v1/users`, `/api/v1/reports`, and health endpoints. Authenticate an authorized imported user with `POST /api/v1/auth/login`, then provide the returned JWT as `Authorization: Bearer <accessToken>` for protected endpoints. Current Swagger schemas are at `/docs-json`; do not infer not-yet-implemented account/customer/card/transaction/payment endpoints from former CICS screens. The approved final contract requires `expectedVersion` for mutable users, accounts, customers, and cards; stale versions return `409 VERSION_CONFLICT`.

## Local development without Docker

A host PostgreSQL 17 instance is supported only when you provide a matching `DATABASE_URL` and the required secrets.

```bash
npm ci
cp .env.example .env
# Edit .env with a reachable PostgreSQL URL and two distinct 32+ character secrets.
set -a
. ./.env
set +a

npm run migration:run
npm run start:dev
```

In a second terminal, use the health checks shown above. Stop development mode with `Ctrl+C`. The importer uses the same `DATABASE_URL`. Never point destructive reset/test workflows at a shared or production database.

To use a local PostgreSQL server, create a development-only role/database as an administrator, choose a non-example password, then put the matching URL in `.env`:

```sql
CREATE ROLE carddemo LOGIN PASSWORD 'replace-this-development-password';
CREATE DATABASE carddemo OWNER carddemo;
```

```dotenv
DATABASE_URL=postgresql://carddemo:replace-this-development-password@localhost:5432/carddemo
```

## Reset and data lifecycle

| Command                    | Effect                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `make down`                | Stops containers and retains the `postgres-data` volume.                                                          |
| `make reset`               | Runs `docker compose down -v --remove-orphans`; destroys the local PostgreSQL volume and all imported/local data. |
| `make migrate`             | Runs the one-shot migration container against the current local database.                                         |
| `npm run migration:revert` | Reverts the latest migration using host `.env` configuration. Development-only: migration downs are destructive.  |
| `npm run migration:run`    | Applies pending migrations using host `.env` configuration.                                                       |

A clean, final-state reset/import sequence is:

```bash
make reset
make up
make import-ebcdic
```

Never reset a database containing data you need. The immutable `00.phase-1-input/` directory is not touched by any reset command.

## Tests and verification

### Current scaffold checks

With Docker available, the repository verification target runs format, lint, type checks, unit tests, production build, Compose validation, and an image build:

```bash
make verify
```

For a faster host-only feedback loop:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Test exact PostgreSQL wire-format behavior under a non-UTC process timezone:

```bash
TZ=America/New_York npm test
```

The migration evidence/fixture verifier is a Python script with no project package dependency:

```bash
python3 scripts/verify-legacy-contract.py
```

### Approved final verification contract

Once all task phases land, `make verify` will additionally run migration smoke tests, canonical EBCDIC import and reconciliation, ASCII mirror allow-list validation, generated OpenAPI validation/coverage, end-to-end API/worker checks, and a Compose health smoke. The current `make verify` performs the checks listed in the Makefile; it does not yet execute importer or E2E coverage. A clean checkout must eventually pass the expanded target without changing `00.phase-1-input/`.

The final E2E sequence resets state, migrates, imports canonical EBCDIC, authenticates authorized admin and user accounts, exercises versioned domain changes, creates a transaction, proves lowest-card selection with the synthetic multi-card fixture, generates reports under both timestamp modes, and downloads an artifact. ASCII verification remains separate and must never be used to authenticate or prove full database equality.

## Troubleshooting

### `docker compose` cannot start or port 5432/3000 is in use

Identify the service using the port, stop it, then retry. Alternatively, make a reviewed Compose port mapping change and use the matching host URL.

```bash
# Linux/macOS examples
lsof -nP -iTCP:5432 -sTCP:LISTEN || true
lsof -nP -iTCP:3000 -sTCP:LISTEN || true
docker compose ps
docker compose logs postgres
```

### API readiness fails but liveness succeeds

`/health/live` only proves that the HTTP process is running. `/health/ready` also runs `SELECT 1`. Check migrations, PostgreSQL health, and the API connection URL:

```bash
docker compose ps
docker compose logs postgres migrate api
make migrate
curl -i http://localhost:3000/api/v1/health/ready
```

### Migration container fails or tables are absent

The database is intentionally empty before migrations run. Read the one-shot service logs and retry only after correcting the cause:

```bash
docker compose logs migrate
make migrate
```

For host-side migrations, confirm that `.env` has been loaded and that `DATABASE_URL` targets the intended development database:

```bash
set -a; . ./.env; set +a
printf '%s\n' "$DATABASE_URL"
npm run migration:show
npm run migration:run
```

### Startup rejects secrets or report mode

Startup validation requires a PostgreSQL URL and 32+ character `CURSOR_SECRET` and `JWT_SECRET`. `REPORT_TIMESTAMP_MODE` accepts only `processed-or-original` or `processed`.

```bash
openssl rand -hex 32
# Put one generated value in CURSOR_SECRET and a second value in JWT_SECRET.
```

### `make import-ebcdic` or `make import-ascii` exits nonzero

These targets execute the importer on the host. Confirm Node 24/npm 11, dependencies, Docker PostgreSQL readiness, and a `.env` with a host-reachable `DATABASE_URL` and valid secrets:

```bash
npm ci
set -a; . ./.env; set +a
curl --fail http://localhost:3000/api/v1/health/ready
make import-ebcdic
```

Do not replace a failed import with ad hoc SQL, an ASCII-only load, or manually created users. Run canonical EBCDIC first; after it completes, use ASCII `--verify-only` for comparison.

### ASCII verification says partial or users are missing

This is correct. There is no ASCII `USRSEC` source. Only canonical EBCDIC creates users, and the mirror workflow must retain partial status. See [source-divergences.md](docs/migration/source-divergences.md).

### Dates, timestamps, or decimals appear changed on a non-UTC host

The application registers PostgreSQL type parsers to preserve date/timestamp/numeric text. Ensure you are using the current build, then reproduce with the non-UTC test command:

```bash
TZ=America/New_York npm test
```

Do not “fix” these fields by converting persistence values to JavaScript `Date` or `number`.

### A versioned write gets HTTP 409

Refetch the resource, use the response's current `version` as `expectedVersion`, and retry only if the requested change is still valid. Do not omit or blindly reuse an old version; the conflict prevents a lost update.

### Docker data should be discarded

Use the destructive reset and restart:

```bash
make reset
make up
```

## Migration source and parity

- [Legacy contract freeze](docs/migration/legacy-contract.md): program/source mapping, fixed widths, keys, validation evidence, and approved decisions.
- [Parity boundaries](docs/migration/parity-boundaries.md): canonical EBCDIC, ASCII limits, intentional behavior changes, and specified report format.
- [ASCII divergence allow-list](docs/migration/source-divergences.md): the only permitted mirror differences.
- [Synthetic multi-card fixture](test/fixtures/synthetic/README.md): test-only proof of the deterministic payment card selection rule.

The migration's acceptance condition is not a blanket ASCII/EBCDIC database comparison. It is canonical EBCDIC import plus explicit, reviewable ASCII mirror boundaries and green contract tests.
