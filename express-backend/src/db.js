import pg from 'pg';

const { Pool, types } = pg;

// Keep source-compatible wire values. node-postgres otherwise turns these into
// local-time Date objects, which changes values under a non-UTC process TZ.
types.setTypeParser(1082, value => value); // DATE
// timestamp without time zone: YYYY-MM-DD HH:MM:SS.ffffff
// PostgreSQL always returns six fractional digits for timestamp(6).
types.setTypeParser(1114, value => { const [whole, fraction = ''] = value.split('.'); return `${whole}.${fraction.padEnd(6, '0').slice(0, 6)}`; });

export function createPool(options = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL must be configured.');

  const ssl = process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false', ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}) }
    : undefined;

  return new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 10),
    ssl,
    ...options
  });
}

export async function withTransaction(pool, callback) {
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    releaseError = error;
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection is no longer trustworthy; release it as broken below.
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export function formatTimestamp(date = new Date()) {
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds() * 1000, 6)}`;
}
