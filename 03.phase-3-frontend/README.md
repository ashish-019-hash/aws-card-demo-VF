# CardDemo Frontend

React and TypeScript frontend for the CardDemo migration.

## Requirements

- Node.js 24 or later
- npm 11 or later
- CardDemo backend on `http://localhost:8080`

## Commands

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

The Vite development server listens on `http://localhost:5173` and proxies `/api` requests to the backend.

Set `VITE_API_BASE_URL` to a public backend origin when the frontend does not use the local Vite proxy.

```bash
VITE_API_BASE_URL=https://backend.example.com npm run dev
```

## Seeded access

Start the Spring Boot backend before the frontend. The frontend uses the real backend session and API endpoints.

- Administrator users: `ADMIN001` through `ADMIN005`
- Regular users: `USER0001` through `USER0005`
- Password for all seeded users: `PASSWORD`

## Screen map

| Route | Legacy screen | User story |
|---|---|---|
| `/sign-in` | COSGN00 | STORY-001, STORY-003 |
| `/menu` | COMEN01 | STORY-004 |
| `/accounts/view/:accountId?` | COACTVW | STORY-006 |
| `/accounts/update/:accountId?` | COACTUP | STORY-007 |
| `/cards` | COCRDLI | STORY-008, STORY-009 |
| `/cards/detail/:accountId?/:cardNumber?` | COCRDSL | STORY-010 |
| `/cards/update/:accountId?/:cardNumber?` | COCRDUP | STORY-011 |
| `/transactions` | COTRN00 | STORY-012, STORY-013 |
| `/transactions/view/:transactionId?` | COTRN01 | STORY-014 |
| `/transactions/add` | COTRN02 | STORY-015, STORY-016 |
| `/reports` | CORPT00 | STORY-018 |
| `/bill-payment` | COBIL00 | STORY-017 |
| `/admin` | COADM01 | STORY-005 |
| `/admin/users` | COUSR00 | STORY-020, STORY-021 |
| `/admin/users/add` | COUSR01 | STORY-022 |
| `/admin/users/update/:userId?` | COUSR02 | STORY-023 |
| `/admin/users/delete/:userId?` | COUSR03 | STORY-024 |

The UI replaces numbered menu entries with links. It replaces `S`, `U`, and `D` codes with labeled row buttons.

The UI maps F3, F4, F5, and F12 to Back, Clear, Save, and Discard actions. Confirmation panels send `Y` or `N` values.
