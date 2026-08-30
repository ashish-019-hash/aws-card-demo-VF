import { createPool } from '../../src/db.js';
import { assertTestDatabaseName, databaseName, validateTestDatabaseUrl } from './test-db-safety.mjs';

const uniqueName = /^carddemo_test_[a-z0-9_]+$/;

export function assertIsolatedTestDatabaseUrl(connectionString) {
  validateTestDatabaseUrl(connectionString);
  const name = databaseName(connectionString);
  if (!uniqueName.test(name)) throw new Error(`Refusing to manage non-isolated test database "${name}". Use carddemo_test_<run-id>.`);
  return name;
}

export function validateAdminDatabaseUrl(connectionString) {
  if (!connectionString) throw new Error('TEST_ADMIN_DATABASE_URL is required to create or drop an isolated test database.');
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('TEST_ADMIN_DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('TEST_ADMIN_DATABASE_URL must use the postgres or postgresql protocol.');
  if (databaseName(connectionString) !== 'postgres') throw new Error('TEST_ADMIN_DATABASE_URL must connect only to the postgres maintenance database.');
  return connectionString;
}

export function quoteIdentifier(name) {
  assertTestDatabaseName(name);
  if (!uniqueName.test(name)) throw new Error(`Refusing to manage non-isolated test database "${name}".`);
  return `"${name.replaceAll('"', '""')}"`;
}

export async function createIsolatedTestDatabase({ testDatabaseUrl = process.env.TEST_DATABASE_URL, adminDatabaseUrl = process.env.TEST_ADMIN_DATABASE_URL } = {}) {
  const name = assertIsolatedTestDatabaseUrl(testDatabaseUrl);
  const admin = createPool({ connectionString: validateAdminDatabaseUrl(adminDatabaseUrl) });
  try {
    await admin.query(`CREATE DATABASE ${quoteIdentifier(name)}`);
  } finally {
    await admin.end();
  }
  return name;
}

export async function dropIsolatedTestDatabase({ testDatabaseUrl = process.env.TEST_DATABASE_URL, adminDatabaseUrl = process.env.TEST_ADMIN_DATABASE_URL } = {}) {
  const name = assertIsolatedTestDatabaseUrl(testDatabaseUrl);
  const admin = createPool({ connectionString: validateAdminDatabaseUrl(adminDatabaseUrl) });
  try {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [name]);
    await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`);
  } finally {
    await admin.end();
  }
  return name;
}
