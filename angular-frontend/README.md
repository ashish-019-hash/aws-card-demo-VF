# CardDemo Angular frontend

## Setup

1. Start the existing backend in another terminal: `cd ../express-backend && npm ci && npm start`
2. Install and run the frontend: `npm ci && npm start`
3. Visit `http://localhost:4200`. The development proxy forwards `/api` and `/health` to port 3000, preserving the session cookie and avoiding CORS.

Demo credentials:

- Business: `USER0001` / `User123!`
- Administrator: `ADMIN001` / `Admin123!`

Commands: `npm run build`, `npm test`, and `npm run test:ci`.

## Browser E2E

Install browser binaries once with `npm run e2e:install`. Browser tests require an explicitly named, isolated PostgreSQL database; they reject `DATABASE_URL` and verify the server-selected database before any migration, truncate, or seed operation.

Each run must use a **new** database named `carddemo_test_e2e_<run-id>`; never point E2E at `carddemo_test` or a development database. The lifecycle helpers refuse any other name and connect to PostgreSQL's `postgres` database only to create/drop the isolated target.

```sh
cd ../express-backend
npm run db:up

cd ../angular-frontend
export E2E_RUN_ID="${CI_JOB_ID:-local_$(date +%s)}"
export TEST_DATABASE_URL="postgresql://carddemo:carddemo_local_only@localhost:5432/carddemo_test_e2e_${E2E_RUN_ID}"
npm run e2e:db:create
npm run e2e                 # Chromium E-001 through E-008
npm run e2e:all             # Full Chromium suite plus Firefox/WebKit E-008 critical smoke
npm run e2e:cross-browser   # Explicitly run Chromium, Firefox, and WebKit projects
npm run e2e:db:drop
```

The E2E setup migrates and reseeds only the supplied run-unique database before each run; it does not use or alter the development database. E-005 intentionally verifies owner-only report retrieval; report account/content scope is a P0 design decision and its domain-content assertion remains an explicit skipped TODO.
