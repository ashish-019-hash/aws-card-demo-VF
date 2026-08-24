import { createPool } from '../src/db.js';
import { createRepository } from '../src/repositories/carddemo.js';

const pool = createPool();
try {
  const result = await createRepository(pool).cleanup(Number(process.env.CLEANUP_LIMIT || 1000));
  console.log(`Removed ${result.sessions} expired sessions, ${result.idempotency} expired idempotency records, and ${result.reports} expired reports.`);
} finally {
  await pool.end();
}
