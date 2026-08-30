import test from 'node:test';
import assert from 'node:assert/strict';
import { agent, login, pool } from '../../test-support/functional.js';

test('F-016 concurrent full-balance payments serialize on the account and produce one ledger entry', async () => {
  const first = agent();
  const second = agent();
  await Promise.all([login(first), login(second)]);
  const preview = await first.get('/api/billing/00000000002/preview').expect(200);
  const before = await pool.query('SELECT current_balance,current_cycle_credit FROM accounts WHERE id=$1', ['00000000002']);
  const payments = Number((await pool.query("SELECT count(*) FROM transactions WHERE description='BILL PAYMENT - ONLINE'")).rows[0].count);

  const responses = await Promise.all([
    first.post('/api/billing/00000000002/pay-full-balance').set('If-Match', preview.headers.etag).set('Idempotency-Key', 'f016-payment-key-a').send({}),
    second.post('/api/billing/00000000002/pay-full-balance').set('If-Match', preview.headers.etag).set('Idempotency-Key', 'f016-payment-key-b').send({})
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 412]);
  const after = await pool.query('SELECT current_balance,current_cycle_credit FROM accounts WHERE id=$1', ['00000000002']);
  assert.equal(Number(after.rows[0].current_balance), 0);
  assert.equal(Number(after.rows[0].current_cycle_credit), Number(before.rows[0].current_cycle_credit) + Number(before.rows[0].current_balance));
  assert.equal(Number((await pool.query("SELECT count(*) FROM transactions WHERE description='BILL PAYMENT - ONLINE'")).rows[0].count), payments + 1);
  assert.equal((await pool.query("SELECT count(*) FROM idempotency WHERE key IN ('f016-payment-key-a','f016-payment-key-b')")).rows[0].count, '1');
});
