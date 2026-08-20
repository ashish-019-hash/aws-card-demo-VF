# CardDemo Angular frontend

## Setup

1. Start the existing backend in another terminal: `cd ../express-backend && npm ci && npm start`
2. Install and run the frontend: `npm ci && npm start`
3. Visit `http://localhost:4200`. The development proxy forwards `/api` and `/health` to port 3000, preserving the session cookie and avoiding CORS.

Demo credentials:

- Business: `USER0001` / `User123!`
- Administrator: `ADMIN001` / `Admin123!`

Commands: `npm run build`, `npm test`, and `npm run test:ci`.
