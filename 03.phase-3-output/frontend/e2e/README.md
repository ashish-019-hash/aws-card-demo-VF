# Playwright functional E2E suite

This suite drives the React application in Chromium and uses the real Spring Boot API through Vite's same-origin `/api` proxy. Except for intentionally invalid form entries, it does not intercept, mock, or simulate application network responses.

## Prerequisites

- Docker (the backend requires Java 21 through `maven:3.9.9-eclipse-temurin-21`)
- Node 20+ and installed frontend dependencies
- Chromium installed once with `npm run e2e:install`

## Deterministic local run

From `03.phase-3-output/frontend`:

```bash
npm install
npm run e2e:install
npm run e2e:local
```

`run-local.sh` refuses to reuse port 8080. It starts the backend with `--carddemo.database.reset=true`, waits for `/v3/api-docs`, runs Chromium tests, then removes the container. The reset clears modern H2 tables in dependency order and reloads immutable bundled extracts, making each command invocation a clean baseline.

For an already running backend at the default address, use:

```bash
npm run e2e
```

The backend must have been started with a clean seed if the suite is to be reproducible:

```bash
cd ../../02.phase-2-output/backend
docker run --rm -p 8080:8080 -v "$PWD":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 mvn spring-boot:run \
  -Dspring-boot.run.arguments="--carddemo.database.reset=true"
```

Set `E2E_API_BASE_URL` or `E2E_BASE_URL` only when deliberately using a different local backend or frontend URL. The default Vite process is automatically started on port 5173 and proxies `/api` to port 8080.

## Test architecture

- `global-setup.ts` probes the live backend before browser execution.
- `support/fixtures.ts` supplies clean browser-session sign-in helpers.
- `support/test-data.ts` holds documented seed credentials and generated test identifiers.
- Specs create only uniquely named security users and one new transaction. Their effects disappear at the next backend reset.
- `playwright.config.ts` serializes test execution because all browser contexts share the real seeded database, preserves traces/screenshots/video for failures, and emits an HTML report.

## Scope and intentional gaps

The web UI implements the modern supported workflows. The matrix records terminal-only behavior and legacy batch artifacts as **not automatable through this frontend** rather than fabricating tests. In particular, PF-key behavior, row-action codes, terminal field focus, the unavailable `COCRDSEC` search source, `JOBS` TDQ submission, backup generation, and fixed 133-byte `TRANREPT` data-set output have no browser-accessible implementation. STORY-018's modern replacement is the persisted report request and its returned, date-filtered/card-sorted transactions; it is tested as report submission/output, not claimed as the legacy batch dataset.

See [TRACEABILITY.md](TRACEABILITY.md) for requirement-level coverage and gaps.
