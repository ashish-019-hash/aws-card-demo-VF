import { createPool } from '../src/db.js';

const timeout = Number(process.env.DB_WAIT_TIMEOUT_MS || 30000);
const started = Date.now();
let lastError;
while (Date.now() - started < timeout) {
  const pool = createPool();
  try {
    await pool.query('SELECT 1');
    await pool.end();
    console.log('PostgreSQL is ready.');
    process.exit(0);
  } catch (error) {
    lastError = error;
    await pool.end().catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
throw lastError || new Error('Timed out waiting for PostgreSQL.');
