# Playwright functional E2E suite

This suite drives the React application in Chromium and uses the real Spring Boot API through Vite's same-origin `/api` proxy. Except for intentionally invalid form entries, it does not intercept, mock, or simulate application network responses.

## Prerequisites

- Docker, installed and running (the backend uses Java 21 through `maven:3.9.9-eclipse-temurin-21`)
- Node 20+ with frontend dependencies installed
- Chromium installed once with `npm run e2e:install`

## Deterministic local run

From `03.phase-3-output/frontend`:

```bash
npm install
npm run e2e:install
npm run e2e:local
```

`e2e:local` requires an unused backend port (default `8080`), starts a Docker-owned Spring Boot process with `--carddemo.database.reset=true`, waits for the API, runs Chromium tests in UTC, and removes the container on every exit path. It mounts `~/.m2` (or `MAVEN_CACHE_DIR`) to speed up Maven dependency resolution. The reset clears modern H2 tables in dependency order and reloads immutable bundled extracts, making each command invocation a clean baseline.

Optional runner controls:

```bash
E2E_BACKEND_PORT=18080 E2E_STARTUP_TIMEOUT_SECONDS=180 npm run e2e:local
MAVEN_CACHE_DIR=/path/to/m2 npm run e2e:local
```

The runner passes the selected API address to the Vite proxy. Its readiness check signs in with the seeded standard user and verifies account `1` and linked card `9680294154603697`; a listening but incorrectly seeded backend cannot pass.

## Destructive-run boundary

The suite creates a transaction, a report request, and a unique temporary security user (then verifies its browser-driven deletion). There is no public transaction-delete/reset endpoint. Accordingly:

- `npm run e2e:local` is the supported command and provides the mandatory clean reset boundary.
- `npm run e2e` refuses to run unless `E2E_RESET_BOUNDARY=fresh-container` or `E2E_ALLOW_EXISTING_BACKEND=true` is set.
- Non-loopback API targets additionally require `E2E_ALLOW_REMOTE_DESTRUCTIVE_RUN=true`. Set both overrides only for an approved, disposable environment that has been reset separately.
- Playwright retries are intentionally disabled: replaying a failed test would create more persistent data and hide lifecycle defects.

For an approved already-running **disposable and manually reset** backend only:

```bash
E2E_ALLOW_EXISTING_BACKEND=true npm run e2e
```

## Quality checks

```bash
npm run e2e:check  # strict TypeScript check plus Prettier over E2E files
npm run e2e        # quality checks and Playwright
npm run e2e:report
```

## Test architecture

- `global-setup.ts` first enforces destructive-run policy, then verifies the live seeded backend data dependencies.
- `support/fixtures.ts` supplies fresh browser-session sign-in helpers.
- `support/test-data.ts` holds seed credentials and creates eight-character, process-unique user IDs.
- Specs retain durable effects only inside the runner-owned database boundary; they verify user deletion after the browser workflow.
- `playwright.config.ts` serializes execution because browser contexts share the real database, disables retries, preserves failure artifacts, and emits an HTML report.

## Scope and intentional gaps

The web UI implements the modern supported workflows. The matrix records terminal-only behavior and legacy batch artifacts as **not automatable through this frontend** rather than fabricating tests. In particular, PF-key behavior, row-action codes, terminal field focus, the unavailable `COCRDSEC` search source, `JOBS` TDQ submission, backup generation, and fixed 133-byte `TRANREPT` data-set output have no browser-accessible implementation. STORY-018's modern replacement is a persisted report request and its returned rows; it is tested as submission/output only and never represented as a legacy formatted batch report.

See [TRACEABILITY.md](TRACEABILITY.md) for requirement-level coverage and gaps.
