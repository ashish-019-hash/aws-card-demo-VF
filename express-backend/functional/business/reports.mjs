import test from 'node:test';
import assert from 'node:assert/strict';
import { adminAgent, agent, createUser, firstCard, login, transactionBody } from '../../test-support/functional.js';

// F-017 remains P0/BLOCKED; catalog owner and target metadata are recorded in qa/catalog-support.json.
test.todo('F-017 BLOCKED/P0 — Owner: reporting-domain design. Target: restrict persisted report rows and totals to the requester’s authorized reporting domain; current content includes every account.');

test('F-018 reports retain custom period, effective-date ordering, totals, and owner-only retrieval', async () => {
  const admin = await adminAgent();
  await createUser(admin, { id: 'USER0002', firstName: 'Second', lastName: 'User', role: 'U', password: 'UserTwo1!' });
  const owner = agent();
  const other = agent();
  await login(owner);
  await login(other, 'USER0002', 'UserTwo1!');
  const card = await firstCard(owner);
  const first = await owner.post('/api/transactions').set('Idempotency-Key', 'f018-ordering-key-a').send({
    ...transactionBody(card.number), description: 'f018 later transaction', amount: 10.5,
    originatedAt: '2099-01-02T12:00:00.000Z', processedAt: '2099-01-02T12:00:00.000Z'
  }).expect(201);
  const second = await owner.post('/api/transactions').set('Idempotency-Key', 'f018-ordering-key-b').send({
    ...transactionBody(card.number), description: 'f018 earlier transaction', amount: -2.25,
    originatedAt: '2099-01-01T12:00:00.000Z', processedAt: '2099-01-01T12:00:00.000Z'
  }).expect(201);

  const report = await owner.post('/api/reports').send({ period: 'custom', startDate: '2099-01-01', endDate: '2099-01-02' }).expect(201);
  assert.deepEqual(report.body.data, { id: report.body.data.id, status: 'completed', period: 'custom', startDate: '2099-01-01', endDate: '2099-01-02' });
  const content = await owner.get(`/api/reports/${report.body.data.id}/content`).expect(200);
  assert.match(content.text, /^Daily Transaction Report\nDate Range: 2099-01-01 to 2099-01-02/m);
  assert.ok(content.text.indexOf(second.body.data.id) < content.text.indexOf(first.body.data.id), 'rows must be ordered by effective date before transaction ID');
  assert.match(content.text, /Account Total 00000000001: 8\.25/);
  assert.match(content.text, /Grand Total: 8\.25/);

  await other.get(`/api/reports/${report.body.data.id}`).expect(403).expect(response => assert.equal(response.body.error.message, 'Report belongs to another user.'));
  await admin.get(`/api/reports/${report.body.data.id}`).expect(403).expect(response => assert.equal(response.body.error.message, 'Business endpoints require a U role.'));
  await owner.post('/api/reports').send({ period: 'custom', startDate: '2023-02-29', endDate: '2023-03-01' }).expect(422);
});
