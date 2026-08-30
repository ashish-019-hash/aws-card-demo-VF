import { Client } from 'pg';

const operation = process.argv[2];
const connectionString = process.env.TEST_DATABASE_URL;
if (!['create', 'drop'].includes(operation)) throw new Error('Usage: node e2e/db-lifecycle.mjs <create|drop>');
if (!connectionString) throw new Error('TEST_DATABASE_URL is required. Use a unique carddemo_test_e2e_<run-id> database.');

const target = new URL(connectionString);
const database = decodeURIComponent(target.pathname).replace(/^\/+/, '');
if (!/^carddemo_test_e2e_[a-z0-9_]+$/i.test(database)) {
  throw new Error(`Refusing E2E database "${database}". Use a unique carddemo_test_e2e_<run-id> name; never reuse carddemo_test.`);
}

target.pathname = '/postgres';
const admin = new Client({ connectionString: target.toString() });
await admin.connect();
try {
  if (operation === 'create') {
    await admin.query(`CREATE DATABASE "${database}"`);
    console.log(`Created isolated E2E database ${database}.`);
  } else {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [database]);
    await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
    console.log(`Dropped isolated E2E database ${database}.`);
  }
} finally {
  await admin.end();
}
