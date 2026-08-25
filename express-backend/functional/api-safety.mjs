import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { agent, app, login, pool } from '../test-support/functional.js';

test('auth sessions use strict, httpOnly cookies and are invalidated at sign-out', async () => {
  const client = agent();
  const signIn = await login(client);
  const cookies = signIn.headers['set-cookie'];
  assert.ok(Array.isArray(cookies) && cookies.length > 0, 'sign-in must set a session cookie');
  assert.match(cookies.join(';'), /HttpOnly/);
  assert.match(cookies.join(';'), /SameSite=Strict/);
  const sessionCount = Number((await pool.query("SELECT count(*) FROM sessions WHERE sess->'user'->>'id'='USER0001'")).rows[0].count);
  assert.equal(sessionCount, 1);
  await client.get('/api/auth/me').expect(200).expect(response => assert.equal(response.body.data.user.id, 'USER0001'));
  await client.post('/api/auth/sign-out').expect(204);
  assert.equal((await pool.query("SELECT count(*) FROM sessions WHERE sess->'user'->>'id'='USER0001'")).rows[0].count, '0');
  await client.get('/api/auth/me').expect(401).expect(response => assert.equal(response.body.error.code, 'UNAUTHENTICATED'));
});

test('client and unexpected server errors redact credentials, database URLs, and stack details', async () => {
  const badCredentials = await request(app).post('/api/auth/sign-in').send({ userId: 'USER0001', password: 'not-the-password' }).expect(401);
  assert.deepEqual(badCredentials.body.error, { code: 'INVALID_CREDENTIALS', message: 'Invalid user ID or password.' });

  const failingApp = createApp({
    pool: {},
    repository: { getUser: async () => { throw new Error('postgresql://db-user:secret@internal/carddemo_test'); } },
    sessionSecret: 'test-session-secret-that-is-long-enough-for-tests'
  });
  const failure = await request(failingApp).post('/api/auth/sign-in').send({ userId: 'USER0001', password: 'private-password' }).expect(500);
  assert.deepEqual(failure.body.error, { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' });
  assert.doesNotMatch(JSON.stringify(failure.body), /db-user:secret|private-password|postgresql:\/\/|@internal/i);
});
