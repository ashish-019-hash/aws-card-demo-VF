import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../../src/repositories/carddemo.js';
import { pool } from '../../test-support/functional.js';

test('F-021 cleanup bounds each retention category and leaves live records intact', async () => {
  const sessionIds = ['f021-expired-session-a', 'f021-expired-session-b', 'f021-live-session'];
  const keys = ['f021-expired-key-a', 'f021-expired-key-b', 'f021-live-key'];
  const reports = ['00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000023'];
  try {
    await pool.query("INSERT INTO sessions(sid,sess,expires_at) VALUES($1,'{}',now()-interval '2 days'),($2,'{}',now()-interval '1 day'),($3,'{}',now()+interval '1 day')", sessionIds);
    await pool.query("INSERT INTO idempotency(user_id,key,target,fingerprint,result,created_at) VALUES('USER0001',$1,'test','{}','{}',now()-interval '32 days'),('USER0001',$2,'test','{}','{}',now()-interval '31 days'),('USER0001',$3,'test','{}','{}',now())", keys);
    await pool.query("INSERT INTO reports(id,owner_id,status,period,start_date,end_date,content,created_at) VALUES($1,'USER0001','completed','custom','2022-01-01','2022-01-01','expired',now()-interval '32 days'),($2,'USER0001','completed','custom','2022-01-01','2022-01-01','expired',now()-interval '31 days'),($3,'USER0001','completed','custom','2022-01-01','2022-01-01','live',now())", reports);
    assert.deepEqual(await createRepository(pool).cleanup(1), { sessions: 1, idempotency: 1, reports: 1 });
    assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE sid = ANY($1)', [sessionIds])).rows[0].count, '2');
    assert.equal((await pool.query('SELECT count(*) FROM idempotency WHERE key = ANY($1)', [keys])).rows[0].count, '2');
    assert.equal((await pool.query('SELECT count(*) FROM reports WHERE id = ANY($1::uuid[])', [reports])).rows[0].count, '2');
    assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE sid=$1', [sessionIds[2]])).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM idempotency WHERE key=$1', [keys[2]])).rows[0].count, '1');
    assert.equal((await pool.query('SELECT count(*) FROM reports WHERE id=$1', [reports[2]])).rows[0].count, '1');
  } finally {
    await pool.query('DELETE FROM sessions WHERE sid = ANY($1)', [sessionIds]);
    await pool.query('DELETE FROM idempotency WHERE key = ANY($1)', [keys]);
    await pool.query('DELETE FROM reports WHERE id = ANY($1::uuid[])', [reports]);
  }
});
