import test from 'node:test';
import assert from 'node:assert/strict';
import { adminAgent, agent, createUser, login } from '../../test-support/functional.js';

test('F-019 administrators create, update, paginate, and delete users while revoking deleted sessions', async () => {
  const admin = await adminAgent();
  const created = await createUser(admin, { id: 'CRUD001', firstName: 'Crud', lastName: 'Target', role: 'U', password: 'LongPass1' });
  const target = agent();
  await login(target, 'CRUD001', 'LongPass1');

  const listed = await admin.get('/api/admin/users?limit=1').expect(200);
  assert.equal(listed.body.data.page.limit, 1);
  const detail = await admin.get('/api/admin/users/CRUD001').expect(200);
  assert.equal(detail.headers.etag, created.headers.etag);
  const updated = await admin.patch('/api/admin/users/CRUD001').set('If-Match', detail.headers.etag).send({ firstName: 'Updated' }).expect(200);
  assert.equal(updated.body.data.firstName, 'Updated');
  await admin.patch('/api/admin/users/CRUD001').set('If-Match', detail.headers.etag).send({ lastName: 'Stale' }).expect(412);
  await admin.delete('/api/admin/users/CRUD001').set('If-Match', updated.headers.etag).expect(204);
  await target.get('/api/menu').expect(401).expect(response => assert.equal(response.body.error.code, 'SESSION_REVOKED'));
});
