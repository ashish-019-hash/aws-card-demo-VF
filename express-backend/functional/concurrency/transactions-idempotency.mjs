import test from 'node:test';
import assert from 'node:assert/strict';
import { agent, firstCard, login, pool, transactionBody } from '../../test-support/functional.js';

test('F-015 concurrent identical transaction requests create once and replay one result', async () => {
  const primary = agent();
  await login(primary);
  const card = await firstCard(primary);
  const key = 'f015-contention-key';
  const before = Number((await pool.query('SELECT count(*) FROM transactions')).rows[0].count);
  const body = transactionBody(card.number);
  const replay = agent();
  await login(replay);

  const responses = await Promise.all([
    primary.post('/api/transactions').set('Idempotency-Key', key).send(body),
    replay.post('/api/transactions').set('Idempotency-Key', key).send(body)
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 201]);
  assert.equal(new Set(responses.map(response => response.body.data.id)).size, 1);
  assert.equal(responses.filter(response => response.body.meta.idempotentReplay).length, 1);
  assert.equal(Number((await pool.query('SELECT count(*) FROM transactions')).rows[0].count), before + 1);

  await primary.post('/api/transactions').set('Idempotency-Key', key).send({ ...body, amount: 13 }).expect(409).expect(response => assert.equal(response.body.error.code, 'IDEMPOTENCY_CONFLICT'));
});
