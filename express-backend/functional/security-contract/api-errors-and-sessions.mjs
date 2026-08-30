import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { agent, app, login, pool } from '../../test-support/functional.js';

test('F-009 malformed JSON and 100kb body limits return bounded JSON errors without request secrets or stack traces', async () => {
  const malformed = await request(app).post('/api/auth/sign-in').set('Content-Type', 'application/json').send('{not-json').expect(400);
  assert.deepEqual(malformed.body.error, { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' });

  const privateValue = 'super-secret-body-value';
  const oversized = await request(app)
    .post('/api/auth/sign-in')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ userId: 'USER0001', password: privateValue, padding: 'x'.repeat(101 * 1024) }))
    .expect(413);
  assert.deepEqual(oversized.body.error, { code: 'PAYLOAD_TOO_LARGE', message: 'Request body must not exceed 100kb.' });
  assert.doesNotMatch(JSON.stringify(oversized.body), new RegExp(`${privateValue}|stack|postgres(?:ql)?:\/\/`, 'i'));
});

test('F-009 only body-parser entity.too.large maps to PAYLOAD_TOO_LARGE; other 413s retain their own code', async () => {
  const custom413App = createApp({
    pool: {},
    repository: { getUser: async () => { throw Object.assign(new Error('Upload rejected.'), { status: 413, code: 'UPLOAD_REJECTED' }); } },
    sessionSecret: 'test-session-secret-that-is-long-enough-for-tests'
  });
  const response = await request(custom413App).post('/api/auth/sign-in').send({ userId: 'USER0001', password: 'anything' }).expect(413);
  assert.deepEqual(response.body.error, { code: 'UPLOAD_REJECTED', message: 'Upload rejected.' });
});

test('F-009 expected server errors redact credentials, database URLs, and implementation details', async () => {
  const failingApp = createApp({
    pool: {},
    repository: { getUser: async () => { throw new Error('postgresql://db-user:database-secret@internal/carddemo_test'); } },
    sessionSecret: 'test-session-secret-that-is-long-enough-for-tests'
  });
  const response = await request(failingApp).post('/api/auth/sign-in').send({ userId: 'USER0001', password: 'private-password' }).expect(500);
  assert.deepEqual(response.body.error, { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' });
  assert.equal(/db-user|database-secret|private-password|postgresql:/.test(JSON.stringify(response.body)), false);
});

test('F-010 session identity persists only after sign-in and is destroyed at sign-out', async () => {
  const client = agent();
  await client.get('/api/auth/me').expect(401).expect(response => assert.equal(response.body.error.code, 'UNAUTHENTICATED'));
  const signedIn = await login(client);
  const cookies = signedIn.headers['set-cookie'];
  assert.ok(Array.isArray(cookies) && cookies.length > 0);
  assert.equal((await pool.query("SELECT count(*) FROM sessions WHERE sess->'user'->>'id'='USER0001'")).rows[0].count, '1');
  await client.get('/api/auth/me').expect(200).expect(response => assert.deepEqual(response.body.data.user, { id: 'USER0001', role: 'U' }));
  await client.post('/api/auth/sign-out').expect(204);
  assert.equal((await pool.query("SELECT count(*) FROM sessions WHERE sess->'user'->>'id'='USER0001'")).rows[0].count, '0');
  await client.get('/api/auth/me').expect(401);
});

test('F-011 session cookies pin HttpOnly, SameSite=Strict, and production Secure flags while unauthenticated mutations remain blocked', async () => {
  const client = agent();
  const signedIn = await login(client);
  const cookie = signedIn.headers['set-cookie'].join(';');
  assert.match(cookie, /carddemo\.sid=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.doesNotMatch(cookie, /Secure/);

  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const productionApp = createApp({ pool, trustProxy: true, sessionSecret: 'test-session-secret-that-is-long-enough-for-tests' });
    const productionCookie = (await request(productionApp).post('/api/auth/sign-in').set('X-Forwarded-Proto', 'https').send({ userId: 'USER0001', password: 'User123!' }).expect(200)).headers['set-cookie'].join(';');
    assert.match(productionCookie, /Secure/);
    assert.match(productionCookie, /SameSite=Strict/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  await request(app).patch('/api/accounts/00000000001').send({ zip: '12345' }).expect(401);
});
