# CardDemo Frontend

React + TypeScript (Vite) frontend for the CardDemo COBOL/CICS-to-modern migration.
Every screen mirrors a legacy BMS map 1:1 (same fields, same F-key actions, same
messages) while talking to the Spring Boot REST backend built in
`02.phase-2-output/backend`.

## Prerequisites

- Node.js 18+ and npm
- The backend running and reachable (default `http://localhost:8080`), with its
  Postgres database seeded — see `02.phase-2-output/backend/README.md`.

## Setup & run

```bash
cd 03.phase-3-output/frontend
npm install
npm run dev        # starts Vite on http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:8080` (see `vite.config.ts`),
so the browser only ever talks to `http://localhost:5173`; cookies
(`JSESSIONID`, `XSRF-TOKEN`) are therefore treated as same-origin. No `VITE_API_BASE_URL`
env var is required for local dev — API calls are made with relative `/api/...` paths.

Other commands:

```bash
npm run build       # tsc -b && vite build -> dist/
npm run lint         # oxlint
npx vitest run       # unit/component test suite (Vitest + Testing Library + MSW)
```

## Seed credentials

| User ID  | Password | Type          | Lands on |
|----------|----------|---------------|----------|
| ADMIN001 | PASSWORD | Admin (`A`)   | `/admin` (Admin Menu, COADM01C) |
| USER0001 | PASSWORD | Regular (`U`) | `/menu` (Main Menu, COMEN01C) |

The backend's seed data uses small sequential account/customer IDs (e.g. `2`,
`10`, `12`, `20`, `27`, `44`, `50`) rather than the legacy screens' fixed
11-digit account number — see "Backend deviations" below.

## Screens / routes

| Route | Legacy screen | Description |
|---|---|---|
| `/signon` | COSGN00C | Sign On |
| `/menu` | COMEN01C | Main Menu (non-admin) |
| `/admin` | COADM01C | Admin Menu |
| `/accounts/view` | COACTVWC | View Account |
| `/accounts/update` | COACTUPC | Update Account |
| `/cards` | COCRDLIC | List Credit Cards |
| `/cards/view` | COCRDSLC | View Credit Card |
| `/cards/update` | COCRDUPC | Update Credit Card |
| `/transactions` | COTRN00C | List Transactions |
| `/transactions/view` | COTRN01C | View Transaction |
| `/transactions/add` | COTRN02C | Add Transaction |
| `/bill-payment` | COBIL00C | Bill Payment |
| `/reports` | CORPT00C | Transaction Reports |
| `/users` | COUSR00C | List Users (admin only) |
| `/users/add` | COUSR01C | Add User (admin only) |
| `/users/update` | COUSR02C | Update User (admin only) |
| `/users/delete` | COUSR03C | Delete User (admin only) |

Admin-only routes are wrapped in an `<AdminGate>` that shows
"No access - Admin Only option." for non-admin users, matching the legacy
dead-menu-option behavior (BR-003).

## Architecture

- `src/api/` — typed fetch client (`client.ts`), endpoint functions
  (`endpoints.ts`), and shared DTO types (`types.ts`). The client auto-attaches
  the `X-XSRF-TOKEN` header from the `XSRF-TOKEN` cookie on mutating requests and
  raises a typed `ApiError` (with `.status`/`.code`/`.errors`) for non-2xx
  responses.
- `src/auth/` — `AuthProvider`/`useAuth` (session state via `/api/session`),
  `RequireAuth` (redirect to `/signon` if not authenticated), `AdminGate`
  (blocks non-admin routes).
- `src/validation/rules.ts` — reusable field validators, each tagged with the
  legacy VR-xxx rule ID it implements, matched 1:1 against
  `01.discovery/validation-rules.md`.
- `src/components/` — shared `ScreenHeader` (app/screen ID/title/live clock,
  matching the legacy BMS header line) and `MessageBar` (success/error/info,
  matching the legacy 24th-line message area).
- `src/pages/` — one file per legacy screen/BMS map.

## Testing

`npx vitest run` — Vitest + Testing Library + MSW (mocked backend responses).
7 test files, 42 tests, covering: validation rules, the API client (CSRF header,
`ApiError` parsing, 401 handling), sign-on, admin gating, and the trickier
multi-step flows (card update's search→edit→confirm→save with a simulated 409
conflict, bill payment's confirm gate, transaction add's confirm gate).

Manual QA was performed against the live backend through the public preview
tunnel: sign-on (regular + admin), main/admin menu, account view, credit card
list (unfiltered + account-filtered, pagination), bill payment (balance
lookup), and the admin-only user list — all confirmed working end-to-end.

## Backend deviations / known gaps (informational, not bugs in this frontend)

- **Account ID format**: the legacy BMS maps fix the account number field at
  exactly 11 digits (VR-005/006/007/008/054/055/072/095). This backend instead
  assigns accounts a plain auto-incrementing `Long` id and does not itself
  enforce an 11-digit format on `GET/PUT /api/accounts/{id}` — real seed data
  uses ids like `2`, `10`, `27`, `50`. Enforcing the legacy fixed width
  client-side would make every real account unreachable, so this frontend
  validates "numeric, non-zero, at most 11 digits" (`nonZeroNumeric` in
  `src/validation/rules.ts`) instead of the exact-length legacy rule. Card
  numbers, by contrast, genuinely are a fixed 16 digits in the backend's data
  model, so `CardListPage`/`CardViewPage`'s card-number filter still enforces
  exact length.
- **VR-001–VR-004** (sign-on mandatory fields, menu option validity) are not
  implemented as distinct rules server-side (see backend README); VR-001/002
  are covered by this frontend's client-side required-field checks plus the
  backend's standard credential validation, and VR-003/004 do not apply since
  the menu is a `GET` returning role-scoped options rather than a typed
  numeric selection.
- **VR-042/VR-047** (state/zip combo, area-code lookup tables) are validated
  server-side against reference tables that are not duplicated in the
  frontend; the frontend surfaces whatever `FieldError` the backend returns
  for these.
- **BR-005**: no account-ownership scoping — any authenticated user can
  view/update any account by ID, exactly as the legacy screens allow. The
  frontend does not add scoping either.

## Troubleshooting

- **403 on `/api/session` (or any `/api/*` call) when accessed through a public
  preview/tunnel URL**: the backend's CORS allow-list only trusts
  `http://localhost:5173` as an `Origin`. When the dev server is reached
  through a different hostname (a tunnel, a LAN IP, etc.), the browser sends
  that hostname as `Origin`, which the backend's CORS filter rejects before
  the request reaches the sign-on logic. `vite.config.ts`'s `/api` proxy
  rewrites the outgoing `Origin` header to `http://localhost:5173` for exactly
  this reason — do not remove that `configure` hook while testing through a
  tunnel. This is a preview-environment artifact, not an application bug.
- **Vite config changes require a dev-server restart**: editing
  `vite.config.ts` (e.g. the proxy block) triggers Vite's "config changed,
  restarting server" behavior automatically; plain source-file edits hot-reload
  without a restart.
- **401 responses** from any authenticated route redirect the user back to
  `/signon` with a "Your session has expired..." message (see
  `AuthProvider`'s `onUnauthorized` listener).
