import { createPool } from '../../express-backend/src/db.js';
import { runMigrations } from '../../express-backend/scripts/migrate.js';
import { assertConnectedTestDatabase, validateTestDatabaseUrl } from '../../express-backend/scripts/test-db.js';
import { seed } from '../../express-backend/src/import-data.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
validateTestDatabaseUrl(testDatabaseUrl);
const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname).replace(/^\/+/, '');
if (!/^carddemo_test_e2e_[a-z0-9_]+$/i.test(databaseName)) {
  throw new Error(`Refusing E2E database "${databaseName || '<missing>'}". Use a unique carddemo_test_e2e_<run-id> database; carddemo_test is not permitted.`);
}
const pool = createPool({ connectionString: testDatabaseUrl });
try {
  await assertConnectedTestDatabase(pool, testDatabaseUrl);
  await runMigrations({ pool });
  await pool.query('TRUNCATE reports,idempotency,sessions,transactions,category_balances,disclosure_groups,card_xrefs,cards,customers,accounts,transaction_categories,transaction_types,users RESTART IDENTITY CASCADE');
  await seed(pool);
} finally {
  await pool.end();
}
