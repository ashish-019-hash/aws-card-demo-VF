import test from 'node:test';
import assert from 'node:assert/strict';
import { agent, login } from '../test-support/functional.js';

test('admin changes revoke a demoted user session while retaining another administrator', async () => {
  const admin = agent(); await login(admin, 'ADMIN001', 'Admin123!');
  const second = await admin.post('/api/admin/users').send({ id: 'ADMIN002', firstName: 'Second', lastName: 'Admin', role: 'A', password: 'LongPass1' }).expect(201);
  const target = await admin.get('/api/admin/users/ADMIN001').expect(200);
  await admin.patch('/api/admin/users/ADMIN001').set('If-Match', target.headers.etag).send({ role: 'U' }).expect(200);
  await admin.get('/api/admin/users').expect(401).expect(response => assert.equal(response.body.error.code, 'SESSION_REVOKED'));
  const replacement = agent(); await login(replacement, 'ADMIN002', 'LongPass1');
  await replacement.delete('/api/admin/users/ADMIN002').set('If-Match', second.headers.etag).expect(409).expect(response => assert.equal(response.body.error.code, 'LAST_ADMIN_FORBIDDEN'));
});

test('report retrieval is owner-only and denied to administrators', async () => {
  const admin = agent(); await login(admin, 'ADMIN001', 'Admin123!');
  await admin.post('/api/admin/users').send({ id: 'USER0002', firstName: 'Second', lastName: 'User', role: 'U', password: 'UserTwo1!' }).expect(201);
  const owner = agent(); await login(owner);
  const other = agent(); await login(other, 'USER0002', 'UserTwo1!');
  const report = await owner.post('/api/reports').send({ period: 'custom', startDate: '2022-06-01', endDate: '2022-06-30' }).expect(201);
  await other.get(`/api/reports/${report.body.data.id}`).expect(403).expect(response => {
    assert.equal(response.body.error.code, 'FORBIDDEN');
    assert.equal(response.body.error.message, 'Report belongs to another user.');
  });
  await admin.get(`/api/reports/${report.body.data.id}`).expect(403).expect(response => {
    assert.equal(response.body.error.code, 'FORBIDDEN');
    assert.equal(response.body.error.message, 'Business endpoints require a U role.');
  });
});

test.todo('persisted report content excludes transactions outside the requester\'s authorized reporting domain once that domain is defined');
