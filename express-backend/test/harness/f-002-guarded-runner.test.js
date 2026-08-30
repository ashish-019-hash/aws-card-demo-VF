import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertIsolatedTestDatabaseUrl,
  quoteIdentifier,
  validateAdminDatabaseUrl
} from '../../qa/bin/isolated-test-db.mjs';
import { runTestFiles } from '../../scripts/test-db.js';

test('F-002 guarded runner rejects absent, development, production, and shared test database URLs', () => {
  assert.throws(() => assertIsolatedTestDatabaseUrl(), /TEST_DATABASE_URL is required/);
  assert.throws(() => assertIsolatedTestDatabaseUrl('postgresql://carddemo:secret@localhost/carddemo'), /non-test database/);
  assert.throws(() => assertIsolatedTestDatabaseUrl('postgresql://carddemo:secret@localhost/carddemo_test'), /non-isolated test database/);
  assert.equal(assertIsolatedTestDatabaseUrl('postgresql://carddemo:secret@localhost/carddemo_test_review_42'), 'carddemo_test_review_42');
  assert.throws(() => validateAdminDatabaseUrl('postgresql://carddemo:secret@localhost/carddemo_test_review_42'), /maintenance database/);
  assert.equal(validateAdminDatabaseUrl('postgresql://carddemo:secret@localhost/postgres'), 'postgresql://carddemo:secret@localhost/postgres');
  assert.equal(quoteIdentifier('carddemo_test_review_42'), '"carddemo_test_review_42"');
});

test('F-002 runner executes every requested file and returns all failures', () => {
  const calls = [];
  const failures = runTestFiles(['/tmp/one.mjs', '/tmp/two.mjs', '/tmp/three.mjs'], {
    connectionString: 'postgresql://carddemo:secret@localhost/carddemo_test_review_42',
    spawn: (_command, _args, options) => {
      calls.push(options.env.DATABASE_URL);
      return calls.length === 2 ? { status: 1 } : { status: 0 };
    }
  });
  assert.equal(calls.length, 3, 'a failure must not stop later test files');
  assert.deepEqual(failures, [{ file: '/tmp/two.mjs', status: 1, signal: undefined }]);
});
