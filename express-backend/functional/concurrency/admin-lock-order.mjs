import test from 'node:test';
import assert from 'node:assert/strict';
import { adminAgent, agent, createUser, login, pool } from '../../test-support/functional.js';

const deadline = request => request.timeout({ deadline: 3_000 });

test('F-020 ordered admin mutations retain the last admin and revoke demoted/deleted sessions', { timeout: 8_000 }, async () => {
  const bootstrap = await adminAgent();
  const second = await createUser(bootstrap, { id: 'ADMIN002', firstName: 'Second', lastName: 'Admin', role: 'A', password: 'LongPass1' });
  const third = await createUser(bootstrap, { id: 'ADMIN003', firstName: 'Third', lastName: 'Admin', role: 'A', password: 'LongPass2' });
  const secondSession = agent();
  const thirdSession = agent();
  await Promise.all([login(secondSession, 'ADMIN002', 'LongPass1'), login(thirdSession, 'ADMIN003', 'LongPass2')]);

  const demotions = await Promise.all([
    deadline(thirdSession.patch('/api/admin/users/ADMIN002').set('If-Match', second.headers.etag).send({ role: 'U' })),
    deadline(secondSession.patch('/api/admin/users/ADMIN003').set('If-Match', third.headers.etag).send({ role: 'U' }))
  ]);
  assert.deepEqual(demotions.map(response => response.status).sort(), [200, 200]);
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role='A'")).rows[0].count, '1');
  await deadline(secondSession.get('/api/admin/users')).expect(401).expect(response => assert.equal(response.body.error.code, 'SESSION_REVOKED'));
  await deadline(thirdSession.get('/api/admin/users')).expect(401).expect(response => assert.equal(response.body.error.code, 'SESSION_REVOKED'));

  const secondAfterRole = await deadline(bootstrap.get('/api/admin/users/ADMIN002')).expect(200);
  const renamed = await deadline(bootstrap.patch('/api/admin/users/ADMIN002').set('If-Match', secondAfterRole.headers.etag).send({ firstName: 'Renamed', lastName: 'Operator', password: 'UpdatedPass1' })).expect(200);
  assert.equal(renamed.body.data.firstName, 'Renamed');
  assert.equal(renamed.body.data.lastName, 'Operator');
  const deletedSession = agent();
  await login(deletedSession, 'ADMIN002', 'UpdatedPass1');

  const onlyAdmin = await deadline(bootstrap.get('/api/admin/users/ADMIN001')).expect(200);
  await deadline(bootstrap.patch('/api/admin/users/ADMIN001').set('If-Match', onlyAdmin.headers.etag).send({ role: 'U' })).expect(409).expect(response => assert.equal(response.body.error.code, 'LAST_ADMIN_FORBIDDEN'));
  await deadline(bootstrap.delete('/api/admin/users/ADMIN001').set('If-Match', onlyAdmin.headers.etag)).expect(409).expect(response => assert.equal(response.body.error.code, 'LAST_ADMIN_FORBIDDEN'));

  const thirdAfterRole = await deadline(bootstrap.get('/api/admin/users/ADMIN003')).expect(200);
  await deadline(bootstrap.delete('/api/admin/users/ADMIN003').set('If-Match', thirdAfterRole.headers.etag)).expect(204);
  await deadline(bootstrap.delete('/api/admin/users/ADMIN002').set('If-Match', renamed.headers.etag)).expect(204);
  await deadline(deletedSession.get('/api/menu')).expect(401).expect(response => assert.equal(response.body.error.code, 'SESSION_REVOKED'));
  assert.equal((await pool.query("SELECT count(*) FROM users WHERE role='A'")).rows[0].count, '1');
});
