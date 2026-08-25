import test from 'node:test';
import assert from 'node:assert/strict';
import { assertConnectedTestDatabase, databaseName, validateTestDatabaseUrl } from '../scripts/test-db.js';

test('test database guard requires an explicit PostgreSQL URL with a distinct test marker', () => {
  assert.equal(databaseName('postgresql://user:pass@localhost:5432/carddemo_test'), 'carddemo_test');
  assert.equal(validateTestDatabaseUrl('postgres://user:pass@localhost:5432/carddemo-integration-test'), 'postgres://user:pass@localhost:5432/carddemo-integration-test');
  assert.throws(() => validateTestDatabaseUrl(), /TEST_DATABASE_URL is required/);
  assert.throws(() => validateTestDatabaseUrl('postgresql://user:pass@localhost:5432/carddemo'), /Refusing to use non-test database/);
  assert.throws(() => validateTestDatabaseUrl('https://example.test/carddemo_test'), /postgres or postgresql protocol/);
  assert.throws(() => validateTestDatabaseUrl('not a URL'), /valid PostgreSQL connection URL/);
});

test('test database guard verifies the server-selected database before destructive work', async () => {
  const matchingPool = { query: async () => ({ rows: [{ name: 'carddemo_test' }] }) };
  await assert.doesNotReject(assertConnectedTestDatabase(matchingPool, 'postgresql://localhost/carddemo_test'));
  const redirectedPool = { query: async () => ({ rows: [{ name: 'carddemo_dev_test' }] }) };
  await assert.rejects(assertConnectedTestDatabase(redirectedPool, 'postgresql://localhost/carddemo_test'), /server selected/);
  const unsafePool = { query: async () => ({ rows: [{ name: 'carddemo' }] }) };
  await assert.rejects(assertConnectedTestDatabase(unsafePool, 'postgresql://localhost/carddemo_test'), /Refusing to use non-test database/);
});
