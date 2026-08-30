import test from 'node:test';
import assert from 'node:assert/strict';
import { PgSessionStore } from '../../src/session-store.js';

const invoke = (store, method, ...args) => new Promise((resolve, reject) => {
  store[method](...args, (error, value) => error ? reject(error) : resolve(value));
});

test('U-004: get returns a detached session object and queries only unexpired sessions', async () => {
  const queries = [];
  const persisted = { user: { id: 'USER0001' }, cookie: { maxAge: 1000 } };
  const store = new PgSessionStore({ query: async (...query) => { queries.push(query); return { rows: [{ sess: persisted }] }; } });

  const result = await invoke(store, 'get', 'sid-1');
  assert.deepEqual(result, persisted);
  assert.notEqual(result, persisted);
  result.user.id = 'MUTATED';
  assert.equal(persisted.user.id, 'USER0001');
  assert.deepEqual(queries, [['SELECT sess FROM sessions WHERE sid=$1 AND expires_at > now()', ['sid-1']]]);
});

test('U-004: get returns null for missing sessions and propagates pool failures', async () => {
  await assert.equal(await invoke(new PgSessionStore({ query: async () => ({ rows: [] }) }), 'get', 'missing'), null);
  await assert.rejects(invoke(new PgSessionStore({ query: async () => { throw new Error('database unavailable'); } }), 'get', 'sid'), /database unavailable/);
});

test('U-004: set serializes sessions and uses explicit expiry, maxAge, or the fixed default', async () => {
  const queries = [];
  const now = Date.parse('2024-02-29T12:00:00.000Z');
  const store = new PgSessionStore({ query: async (...query) => { queries.push(query); return { rows: [] }; } }, { now: () => now });

  await invoke(store, 'set', 'explicit', { cookie: { expires: '2024-03-01T12:00:00.000Z' }, user: { id: 'A' } });
  await invoke(store, 'set', 'max-age', { cookie: { maxAge: 1500 }, user: { id: 'B' } });
  await invoke(store, 'set', 'default', { user: { id: 'C' } });

  const values = queries.map(([, parameters]) => parameters);
  assert.equal(values[0][1], JSON.stringify({ cookie: { expires: '2024-03-01T12:00:00.000Z' }, user: { id: 'A' } }));
  assert.equal(values[0][2].toISOString(), '2024-03-01T12:00:00.000Z');
  assert.equal(values[1][2].toISOString(), '2024-02-29T12:00:01.500Z');
  assert.equal(values[2][2].toISOString(), '2024-02-29T20:00:00.000Z');
  assert.ok(queries.every(([sql]) => sql.includes('ON CONFLICT(sid) DO UPDATE')));
});

test('U-004: destroy deletes the session and touch never rewrites or extends it', async () => {
  const queries = [];
  const store = new PgSessionStore({ query: async (...query) => { queries.push(query); return { rows: [] }; } });

  await invoke(store, 'destroy', 'sid-1');
  await invoke(store, 'touch', 'sid-1', { cookie: { maxAge: 1000 } });

  assert.deepEqual(queries, [['DELETE FROM sessions WHERE sid=$1', ['sid-1']]]);
});
