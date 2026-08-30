import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { formatTimestamp, withTransaction } from '../../src/db.js';

test('U-005: withTransaction commits successful work and releases the client', async () => {
  const calls = [];
  const client = {
    query: async sql => { calls.push(sql); return { rows: [] }; },
    release: error => calls.push(['release', error])
  };
  const pool = { connect: async () => client };

  const result = await withTransaction(pool, async db => {
    assert.equal(db, client);
    await db.query('INSERT INTO example VALUES (1)');
    return 'completed';
  });

  assert.equal(result, 'completed');
  assert.deepEqual(calls, ['BEGIN', 'INSERT INTO example VALUES (1)', 'COMMIT', ['release', undefined]]);
});

test('U-005: withTransaction rolls back failures and releases the broken client with the original error', async () => {
  const calls = [];
  const failure = new Error('write failed');
  const client = {
    query: async sql => {
      calls.push(sql);
      if (sql === 'ROLLBACK') throw new Error('connection lost during rollback');
      return { rows: [] };
    },
    release: error => calls.push(['release', error])
  };

  await assert.rejects(withTransaction({ connect: async () => client }, async () => { throw failure; }), failure);
  assert.deepEqual(calls.slice(0, 2), ['BEGIN', 'ROLLBACK']);
  assert.deepEqual(calls[2], ['release', failure]);
});

test('U-003: DATE and timestamp parsers preserve PostgreSQL wire values', () => {
  assert.equal(pg.types.getTypeParser(1082)('2024-02-29'), '2024-02-29');
  assert.equal(pg.types.getTypeParser(1114)('2024-02-29 23:59:59.123456'), '2024-02-29 23:59:59.123456');
  assert.equal(pg.types.getTypeParser(1114)('2024-02-29 23:59:59.1'), '2024-02-29 23:59:59.100000');
});

test('U-003: formatTimestamp uses UTC and emits six fractional digits', () => {
  const value = new Date('2024-02-29T23:59:59.007Z');
  assert.equal(formatTimestamp(value), '2024-02-29 23:59:59.007000');
});
