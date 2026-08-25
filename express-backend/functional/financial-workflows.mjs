import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../src/repositories/carddemo.js';
import { agent, firstCard, login, pool, transactionBody } from '../test-support/functional.js';

test('transaction idempotency replays without adding a second transaction', async () => {
  const client = agent(); await login(client);
  const card = await firstCard(client);
  const key = 'functional-idempotency-key';
  const before = Number((await pool.query('SELECT count(*) FROM transactions')).rows[0].count);
  const first = await client.post('/api/transactions').set('Idempotency-Key', key).send(transactionBody(card.number)).expect(201);
  const replay = await client.post('/api/transactions').set('Idempotency-Key', key).send(transactionBody(card.number)).expect(200);
  assert.equal(replay.body.meta.idempotentReplay, true);
  assert.equal(replay.body.data.id, first.body.data.id);
  assert.equal(Number((await pool.query('SELECT count(*) FROM transactions')).rows[0].count), before + 1);
});

test('a stale billing precondition leaves account, payment ledger, and idempotency records unchanged', async () => {
  const client = agent(); await login(client);
  const key = 'stale-billing-payment-key';
  const preview = await client.get('/api/billing/00000000002/preview').expect(200);
  const before = await pool.query('SELECT current_balance FROM accounts WHERE id=$1', ['00000000002']);
  const transactions = Number((await pool.query("SELECT count(*) FROM transactions WHERE description='BILL PAYMENT - ONLINE'")).rows[0].count);
  await client.patch('/api/accounts/00000000002').set('If-Match', preview.headers.etag).send({ zip: '99999' }).expect(200);
  await client.post('/api/billing/00000000002/pay-full-balance').set('If-Match', preview.headers.etag).set('Idempotency-Key', key).send({}).expect(412);
  assert.equal((await pool.query('SELECT current_balance FROM accounts WHERE id=$1', ['00000000002'])).rows[0].current_balance, before.rows[0].current_balance);
  assert.equal(Number((await pool.query("SELECT count(*) FROM transactions WHERE description='BILL PAYMENT - ONLINE'")).rows[0].count), transactions);
  assert.equal((await pool.query('SELECT count(*) FROM idempotency WHERE user_id=$1 AND key=$2', ['USER0001', key])).rows[0].count, '0');
});

test('cleanup removes one expired row per category while preserving another expired row and all live rows', async () => {
  const sessions = ['cleanup-expired-session-1', 'cleanup-expired-session-2', 'cleanup-live-session'];
  const idempotency = ['cleanup-expired-idempotency-1', 'cleanup-expired-idempotency-2', 'cleanup-live-idempotency'];
  const reports = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003'];
  try {
    await pool.query("INSERT INTO sessions(sid,sess,expires_at) VALUES($1,'{}',now()-interval '2 days'),($2,'{}',now()-interval '1 day'),($3,'{}',now()+interval '1 day')", sessions);
    await pool.query("INSERT INTO idempotency(user_id,key,target,fingerprint,result,created_at) VALUES('USER0001',$1,'test','{}','{}',now()-interval '32 days'),('USER0001',$2,'test','{}','{}',now()-interval '31 days'),('USER0001',$3,'test','{}','{}',now())", idempotency);
    await pool.query("INSERT INTO reports(id,owner_id,status,period,start_date,end_date,content,created_at) VALUES($1,'USER0001','completed','custom','2022-01-01','2022-01-01','expired',now()-interval '32 days'),($2,'USER0001','completed','custom','2022-01-01','2022-01-01','expired',now()-interval '31 days'),($3,'USER0001','completed','custom','2022-01-01','2022-01-01','live',now())", reports);
    assert.deepEqual(await createRepository(pool).cleanup(1), { sessions: 1, idempotency: 1, reports: 1 });
    assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE sid = ANY($1) AND expires_at <= now()', [sessions])).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE sid=$1', [sessions[2]])).rows[0].count, '1');
    assert.equal((await pool.query("SELECT count(*) FROM idempotency WHERE key = ANY($1) AND created_at < now()-interval '30 days'", [idempotency])).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM idempotency WHERE key=$1', [idempotency[2]])).rows[0].count, '1');
    assert.equal((await pool.query("SELECT count(*) FROM reports WHERE id = ANY($1::uuid[]) AND created_at < now()-interval '30 days'", [reports])).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM reports WHERE id=$1', [reports[2]])).rows[0].count, '1');
  } finally {
    await pool.query('DELETE FROM sessions WHERE sid = ANY($1)', [sessions]);
    await pool.query('DELETE FROM idempotency WHERE key = ANY($1)', [idempotency]);
    await pool.query('DELETE FROM reports WHERE id = ANY($1::uuid[])', [reports]);
  }
});
