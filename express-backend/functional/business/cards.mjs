import test from 'node:test';
import assert from 'node:assert/strict';
import { agent, firstCard, login } from '../../test-support/functional.js';

test('F-014 cards preserve account/card pairing, pagination, and inactive-card behavior', async () => {
  const client = agent();
  await login(client);
  const card = await firstCard(client);

  const detail = await client.get(`/api/cards/${card.number}`).expect(200);
  assert.equal(detail.body.data.accountId, '00000000001');
  assert.equal('cvv' in detail.body.data, false);
  await client.get(`/api/cards?accountId=00000000002&cardNumber=${card.number}`).expect(404);
  await client.get(`/api/cards?accountId=00000000001&cardNumber=${card.number}&cursor=${card.number}`).expect(200).expect(response => assert.equal(response.body.data.items.length, 0));

  const page = await client.get('/api/cards?limit=1').expect(200);
  const next = await client.get(`/api/cards?limit=1&cursor=${page.body.data.page.nextCursor}`).expect(200);
  assert.notEqual(next.body.data.items[0].number, page.body.data.items[0].number);
  await client.get(`/api/cards?accountId=00000000001&cursor=${page.body.data.items[0].number}`).expect(400);

  await client.patch(`/api/cards/${card.number}`).set('If-Match', detail.headers.etag).send({ active: 'N' }).expect(200);
  await client.post('/api/transactions').set('Idempotency-Key', 'f014-inactive-card').send({ cardNumber: card.number, typeCode: '01', categoryCode: '0001', source: 'API', description: 'inactive card', amount: 1 }).expect(422);
});
