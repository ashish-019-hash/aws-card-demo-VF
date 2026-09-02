# CardDemo React Frontend

A React + TypeScript/Vite modernization of all 18 CardDemo stories. The app preserves the legacy information architecture with accessible, responsive web screens rather than terminal layout conventions.

## Included workflows

- Session-cookie sign-on, role-specific menus, CSRF token retrieval, and sign-out
- Account inquiry and optimistic-versioned account/customer maintenance
- Card browsing, lookup, detail, and maintenance
- Transaction browsing, detail lookup, confirmed transaction entry, and report request/output
- Full-balance bill payment with Y/N confirmation
- Administrator-only security-user list, add, update, and delete workflows
- Client-side validation for required keys, identifiers, confirmation gates, numeric/date/amount formats, card expiry, names, FICO range, and account/customer basics; the backend remains authoritative for all documented rules.
- Session restoration after reload, centralized 401 sign-out recovery, and CSRF-token refresh/retry for a rejected mutation.

## Prerequisites

- Node.js 20+ and npm
- The Spring Boot backend running at `http://localhost:8080` (or a configured public backend URL)

## Setup and run

```bash
cd 03.phase-3-output/frontend
npm install
npm run dev
```

The default Vite URL is `http://localhost:5173`. The app calls relative `/api` paths; the Vite development server proxies them to `http://localhost:8080`, preserving same-origin browser cookies and CSRF behavior.

**Same-origin proxy required:** do not set `VITE_API_BASE_URL` to a separate backend origin in a normal browser deployment. The backend does not currently configure CORS/credential support for a cross-origin frontend. Keep the frontend and `/api` on one origin through a reverse proxy (the included Vite proxy for development) unless backend CORS and cookie settings are changed deliberately. Restart `npm run dev` after proxy/environment changes.

## Local credentials

| User ID | Password | Role |
| --- | --- | --- |
| `ADMIN001` | `ADMIN123` | Security administrator |
| `USER0001` | `USER123` | Standard user |

Development credentials only; never use them in a non-local environment.

## Verification

```bash
npm test
npm run build
```

Tests use Vitest, React Testing Library, and MSW API mocks. They cover sign-in validation, session establishment, and account retrieval. The production build runs TypeScript checking before Vite output generation.

## Backend startup and reset

From `02.phase-2-output/backend`:

```bash
docker run --rm -p 8080:8080 -v "$PWD":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 mvn spring-boot:run
```

For a deterministic fresh seed:

```bash
docker run --rm -p 8080:8080 -v "$PWD":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 mvn spring-boot:run \
  -Dspring-boot.run.arguments="--carddemo.database.reset=true"
```

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| Sign-in or data calls fail | Start the backend on port 8080; review its console output. |
| `401 Sign on is required` | Sign in again; session cookies exist only for the running browser/backend session. |
| `403 Request is not authorized` | Sign in using `ADMIN001` for user-administration workflows. |
| Mutation rejected for CSRF | Refresh/sign in again. The frontend obtains `/api/csrf` after sign-on and sends `X-XSRF-TOKEN` for mutations. |
| `409 STALE_WRITE` | Retrieve the account/card again and reapply the changes; another write updated its version. |
| Preview cannot reach a backend | Keep `/api` behind the same frontend/reverse-proxy origin; do not configure an absolute backend URL unless its CORS and credential policy is updated. |
| Backend changes disappear | The backend H2 database is in memory. Restart or use the reset flag to reload the seed. |
