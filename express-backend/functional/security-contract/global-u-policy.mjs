import test from 'node:test';
import assert from 'node:assert/strict';
import { adminAgent, agent, createUser, login } from '../../test-support/functional.js';


test('F-012 distinct U users intentionally share the global interactive account and card domain', async () => {
  const administrator = await adminAgent();
  await createUser(administrator, { id: 'USER0002', firstName: 'Second', lastName: 'User', role: 'U', password: 'UserTwo1!' });
  const firstUser = agent();
  const secondUser = agent();
  await login(firstUser);
  await login(secondUser, 'USER0002', 'UserTwo1!');

  const accountReadByFirst = await firstUser.get('/api/accounts/00000000001').expect(200);
  const accountReadBySecond = await secondUser.get('/api/accounts/00000000001').expect(200);
  assert.equal(accountReadByFirst.body.data.id, accountReadBySecond.body.data.id);
  await secondUser.patch('/api/accounts/00000000001').set('If-Match', accountReadBySecond.headers.etag).send({ zip: '54321' }).expect(200);
  await firstUser.get('/api/accounts/00000000001').expect(200).expect(response => assert.equal(response.body.data.zip, '54321'));
  const card = (await firstUser.get('/api/cards?accountId=00000000001&limit=1').expect(200)).body.data.items[0];
  await secondUser.get(`/api/cards/${card.number}`).expect(200).expect(response => assert.equal(response.body.data.number, card.number));
});

test('F-012 role gates preserve the global split: U has no administration and A has no business access', async () => {
  const user = agent();
  await login(user);
  await user.get('/api/admin/users').expect(403).expect(response => assert.equal(response.body.error.code, 'FORBIDDEN'));

  const administrator = agent();
  await login(administrator, 'ADMIN001', 'Admin123!');
  await administrator.get('/api/accounts/00000000001').expect(403).expect(response => {
    assert.deepEqual(response.body.error, { code: 'FORBIDDEN', message: 'Business endpoints require a U role.' });
  });
});
