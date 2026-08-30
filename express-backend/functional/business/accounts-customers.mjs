import test from 'node:test';
import assert from 'node:assert/strict';
import { agent, firstCard, login } from '../../test-support/functional.js';

test('F-013 accounts and customers expose linked records, mask sensitive values, and require fresh ETags', async () => {
  const client = agent();
  await login(client);

  const account = await client.get('/api/accounts/00000000001').expect(200);
  assert.equal(account.body.data.id, '00000000001');
  assert.equal(account.body.data.customers.length, 1);
  assert.equal(account.body.data.cards.length, 1);
  assert.match(account.body.data.customers[0].ssn, /^\*+/);
  assert.equal('cvv' in account.body.data.cards[0], false);

  const customerId = account.body.data.customers[0].id;
  const customer = await client.get(`/api/accounts/00000000001/customers/${customerId}`).expect(200);
  assert.match(customer.body.data.governmentId, /^\*+/);
  assert.match(customer.body.data.eftAccountId, /^\*+/);
  await client.patch(`/api/accounts/00000000001/customers/${customerId}`).set('If-Match', customer.headers.etag).send({ phone1: '555-0101' }).expect(200);
  await client.patch(`/api/accounts/00000000001/customers/${customerId}`).set('If-Match', customer.headers.etag).send({ phone1: '555-0102' }).expect(412);
  await client.patch(`/api/accounts/00000000001/customers/${customerId}`).set('If-Match', '"1"').send({ ssn: '123456789' }).expect(422);

  await client.get('/api/accounts/00000000001/customers/999999999').expect(404);
  const card = await firstCard(client);
  assert.equal(card.accountId, account.body.data.id);
});
