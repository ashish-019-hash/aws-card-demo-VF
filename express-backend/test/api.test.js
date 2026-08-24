import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createPool, withTransaction } from '../src/db.js';
import { createApp } from '../src/app.js';
import { seed, signed } from '../src/import-data.js';
import { createRepository } from '../src/repositories/carddemo.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL must be set by scripts/test-db.js.');
const pool = createPool({ connectionString: databaseUrl });
let app;

before(async () => {
  await pool.query('SELECT 1');
  app = createApp({ pool, sessionSecret: 'test-session-secret-that-is-long-enough-for-tests' });
});
beforeEach(async () => {
  await pool.query('TRUNCATE reports,idempotency,sessions,transactions,category_balances,disclosure_groups,card_xrefs,cards,customers,accounts,transaction_categories,transaction_types,users RESTART IDENTITY CASCADE');
  await seed(pool);
});
after(async () => pool.end());

async function login(agent, userId = 'USER0001', password = 'User123!') {
  return agent.post('/api/auth/sign-in').send({ userId, password }).expect(200);
}
async function firstCard(agent, accountId = '00000000001') {
  return (await agent.get(`/api/cards?accountId=${accountId}&limit=1`).expect(200)).body.data.items[0];
}

const transactionBody = cardNumber => ({ cardNumber, typeCode: '01', categoryCode: '0001', source: 'API', description: 'test purchase', amount: 12.34 });

test('COBOL overpunch parser handles positive and negative implied decimals', () => {
  assert.equal(signed('0000005047G'), 504.77);
  assert.equal(signed('0000009190}'), -919);
  assert.equal(signed('0000000010J'), -1.01);
  assert.equal(signed('0000000010R'), -1.09);
});

test('migrated COBOL fixture has canonical counts, relationships, and constraints', async () => {
  const result = await pool.query("SELECT (SELECT count(*) FROM accounts) accounts,(SELECT count(*) FROM customers) customers,(SELECT count(*) FROM cards) cards,(SELECT count(*) FROM card_xrefs) xrefs,(SELECT count(*) FROM transactions) transactions,(SELECT count(*) FROM transaction_types) types,(SELECT count(*) FROM transaction_categories) categories,(SELECT count(*) FROM category_balances) balances,(SELECT count(*) FROM disclosure_groups) disclosures");
  assert.deepEqual(result.rows[0], { accounts: '50', customers: '50', cards: '50', xrefs: '50', transactions: '300', types: '7', categories: '18', balances: '50', disclosures: '51' });
  assert.equal((await pool.query('SELECT count(*) FROM card_xrefs x JOIN cards c ON c.number=x.card_number AND c.account_id=x.account_id')).rows[0].count, '50');
  await assert.rejects(pool.query("INSERT INTO users(id,first_name,last_name,role,password_hash) VALUES('BADUSER','Bad','Role','X','x')"), { code: '23514' });
});

test('auth role split, malformed JSON, lookup and route errors preserve contract', async () => {
  const user = request.agent(app); await login(user);
  await user.get('/api/admin/users').expect(403);
  await user.get('/api/lookup/transaction-types').expect(200).expect(response => assert.equal(response.body.data.length, 7));
  await user.get('/api/lookup/transaction-categories?typeCode=01').expect(200);
  await request(app).post('/api/auth/sign-in').set('Content-Type', 'application/json').send('{bad').expect(400).expect(response => assert.equal(response.body.error.code, 'INVALID_JSON'));
  await user.get('/not-a-route').expect(404).expect(response => assert.equal(response.body.error.code, 'NOT_FOUND'));
});

test('account/customer masking, associations, sensitive read-only fields, and stale ETags work', async () => {
  const agent = request.agent(app); await login(agent);
  const account = await agent.get('/api/accounts/00000000001').expect(200);
  assert.match(account.body.data.customers[0].ssn, /^\*+/);
  const customerId = account.body.data.customers[0].id;
  const customer = await agent.get(`/api/accounts/00000000001/customers/${customerId}`).expect(200);
  await agent.patch(`/api/accounts/00000000001/customers/${customerId}`).set('If-Match', customer.headers.etag).send({ governmentId: customer.body.data.governmentId }).expect(422);
  await agent.patch(`/api/accounts/00000000001/customers/${customerId}`).set('If-Match', customer.headers.etag).send({ phone1: '555-555-5555' }).expect(200);
  await agent.patch(`/api/accounts/00000000001/customers/${customerId}`).set('If-Match', customer.headers.etag).send({ phone1: '555-555-5555' }).expect(412);
  await agent.get('/api/accounts/00000000001/customers/999999999').expect(404);
});

test('card pair semantics, inactive cards, and cursor errors preserve API behavior', async () => {
  const agent = request.agent(app); await login(agent);
  const card = await firstCard(agent);
  await agent.get(`/api/cards?accountId=00000000002&cardNumber=${card.number}`).expect(404);
  const pair = await agent.get(`/api/cards?accountId=00000000001&cardNumber=${card.number}`).expect(200);
  await agent.get(`/api/cards?accountId=00000000001&cardNumber=${card.number}&cursor=${card.number}`).expect(200).expect(response => assert.equal(response.body.data.items.length, 0));
  await agent.get('/api/cards?cursor=nope').expect(400).expect(response => assert.equal(response.body.error.code, 'INVALID_CURSOR'));
  const detail = await agent.get(`/api/cards/${card.number}`).expect(200);
  await agent.patch(`/api/cards/${card.number}`).set('If-Match', detail.headers.etag).send({ active: 'N' }).expect(200);
  await agent.post('/api/transactions').set('Idempotency-Key', 'inactive-card-key').send(transactionBody(card.number)).expect(422);
  assert.equal(pair.body.data.items[0].number, card.number);
});

test('keyset pagination is exclusive, validates filter membership, and supports later pages', async () => {
  const agent = request.agent(app); await login(agent);
  const cards1 = await agent.get('/api/cards?limit=1').expect(200);
  const cards2 = await agent.get(`/api/cards?limit=1&cursor=${cards1.body.data.page.nextCursor}`).expect(200);
  const cards3 = await agent.get(`/api/cards?limit=1&cursor=${cards2.body.data.page.nextCursor}`).expect(200);
  assert.notEqual(cards1.body.data.items[0].number, cards2.body.data.items[0].number);
  assert.notEqual(cards2.body.data.items[0].number, cards3.body.data.items[0].number);
  await agent.get(`/api/cards?accountId=00000000001&cursor=${cards1.body.data.items[0].number}`).expect(400).expect(response => assert.equal(response.body.error.code, 'INVALID_CURSOR'));
  await agent.get('/api/transactions?cursor=nope').expect(400).expect(response => assert.equal(response.body.error.code, 'INVALID_CURSOR'));
});

test('transaction idempotency, sequence uniqueness, and fixed-width timestamp parity work', async () => {
  const agent = request.agent(app); await login(agent);
  const card = await firstCard(agent); const body = transactionBody(card.number);
  const [one, two] = await Promise.all([
    agent.post('/api/transactions').set('Idempotency-Key', 'same-request-key').send(body),
    agent.post('/api/transactions').set('Idempotency-Key', 'same-request-key').send(body)
  ]);
  assert.deepEqual([one.status, two.status].sort(), [200, 201]);
  assert.equal(one.body.data.id, two.body.data.id);
  await agent.post('/api/transactions').set('Idempotency-Key', 'same-request-key').send({ ...body, amount: 13 }).expect(409);
  await agent.post('/api/transactions').set('Idempotency-Key', 'too-large-amount-key').send({ ...body, amount: 1000000000 }).expect(422).expect(response => assert.match(response.body.error.message, /S9\(9\)V99/));
  const creates = await Promise.all(Array.from({ length: 5 }, (_, index) => agent.post('/api/transactions').set('Idempotency-Key', `unique-sequence-key-${index}`).send({ ...body, description: `purchase ${index}` }).expect(201)));
  assert.equal(new Set(creates.map(response => response.body.data.id)).size, 5);
  assert.ok(creates.every(response => /^\d{16}$/.test(response.body.data.id) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(response.body.data.originatedAt)));
});

test('billing is atomic and detects body and cross-target idempotency conflicts', async () => {
  const agent = request.agent(app); await login(agent);
  const preview = await agent.get('/api/billing/00000000002/preview').expect(200);
  const first = await agent.post('/api/billing/00000000002/pay-full-balance').set('If-Match', preview.headers.etag).set('Idempotency-Key', 'payment-key-unique').send({}).expect(201);
  await agent.post('/api/billing/00000000002/pay-full-balance').set('Idempotency-Key', 'payment-key-unique').send({}).expect(200);
  await agent.post('/api/billing/00000000001/pay-full-balance').set('Idempotency-Key', 'payment-key-unique').send({}).expect(409);
  await agent.post('/api/billing/00000000002/pay-full-balance').set('Idempotency-Key', 'payment-key-unique').send({ changed: true }).expect(409);
  assert.equal(first.body.data.account.currentBalance, 0);
});

test('reports support custom, monthly/yearly defaults, invalid dates, ownership, and malformed IDs', async () => {
  const admin = request.agent(app); await login(admin, 'ADMIN001', 'Admin123!');
  await admin.post('/api/admin/users').send({ id: 'USER0002', firstName: 'Second', lastName: 'User', role: 'U', password: 'UserTwo1!' }).expect(201);
  const one = request.agent(app), two = request.agent(app); await login(one); await login(two, 'USER0002', 'UserTwo1!');
  const report = await one.post('/api/reports').send({ period: 'custom', startDate: '2022-06-01', endDate: '2022-06-30' }).expect(201);
  const content = await one.get(`/api/reports/${report.body.data.id}/content`).expect(200); assert.match(content.text, /0000000000683580/);
  await two.get(`/api/reports/${report.body.data.id}`).expect(403);
  await one.post('/api/reports').send({ period: 'monthly' }).expect(201);
  await one.post('/api/reports').send({ period: 'yearly' }).expect(201);
  await one.post('/api/reports').send({ period: 'custom', startDate: '2023-02-29', endDate: '2023-03-01' }).expect(422);
  await one.get('/api/reports/not-a-uuid').expect(404).expect(response => assert.equal(response.body.error.code, 'NOT_FOUND'));
});

test('admin CRUD preserves last-admin, self-delete, stale ETag, and session revocation safeguards', async () => {
  const admin = request.agent(app); await login(admin, 'ADMIN001', 'Admin123!');
  const own = await admin.get('/api/admin/users/ADMIN001').expect(200);
  await admin.delete('/api/admin/users/ADMIN001').set('If-Match', own.headers.etag).expect(409).expect(response => assert.equal(response.body.error.code, 'LAST_ADMIN_FORBIDDEN'));
  const second = await admin.post('/api/admin/users').send({ id: 'ADMIN002', firstName: 'Second', lastName: 'Admin', role: 'A', password: 'LongPass1' }).expect(201);
  await admin.delete('/api/admin/users/ADMIN001').set('If-Match', own.headers.etag).expect(409).expect(response => assert.equal(response.body.error.code, 'SELF_DELETE_FORBIDDEN'));
  const created = await admin.post('/api/admin/users').send({ id: 'TESTUSER', firstName: 'Test', lastName: 'User', role: 'U', password: 'LongPass1' }).expect(201);
  const user = request.agent(app); await login(user, 'TESTUSER', 'LongPass1');
  await admin.patch('/api/admin/users/TESTUSER').set('If-Match', '"0"').send({ firstName: 'New' }).expect(412);
  await admin.delete('/api/admin/users/TESTUSER').set('If-Match', created.headers.etag).expect(204);
  await user.get('/api/menu').expect(401).expect(response => assert.equal(response.body.error.code, 'SESSION_REVOKED'));
  await admin.delete('/api/admin/users/ADMIN002').set('If-Match', second.headers.etag).expect(204);
});

test('deleting an owner cascades reports and idempotency, and cleanup removes expired retention rows', async () => {
  const admin = request.agent(app); await login(admin, 'ADMIN001', 'Admin123!');
  const user = await admin.post('/api/admin/users').send({ id: 'OWNER001', firstName: 'Owner', lastName: 'One', role: 'U', password: 'LongPass1' }).expect(201);
  const owner = request.agent(app); await login(owner, 'OWNER001', 'LongPass1');
  const card = await firstCard(owner);
  await owner.post('/api/transactions').set('Idempotency-Key', 'owner-idempotency-key').send(transactionBody(card.number)).expect(201);
  await owner.post('/api/reports').send({ startDate: '2022-06-01', endDate: '2022-06-30' }).expect(201);
  assert.equal((await pool.query("SELECT count(*) FROM reports WHERE owner_id='OWNER001'")).rows[0].count, '1');
  await admin.delete('/api/admin/users/OWNER001').set('If-Match', user.headers.etag).expect(204);
  assert.equal((await pool.query("SELECT count(*) FROM idempotency WHERE user_id='OWNER001'")).rows[0].count, '0');
  assert.equal((await pool.query("SELECT count(*) FROM reports WHERE owner_id='OWNER001'")).rows[0].count, '0');
  await pool.query("INSERT INTO sessions(sid,sess,expires_at) VALUES('expired','{}',now()-interval '1 day')");
  await pool.query("UPDATE reports SET created_at=now()-interval '31 days'");
  const result = await createRepository(pool).cleanup();
  assert.ok(result.sessions >= 1);
});

test('transactions roll back failed work', async () => {
  const before = (await pool.query('SELECT count(*) FROM users')).rows[0].count;
  await assert.rejects(withTransaction(pool, async db => { await db.query("INSERT INTO users(id,first_name,last_name,role,password_hash) VALUES('ROLLBACK','A','B','U','x')"); throw new Error('rollback'); }));
  assert.equal((await pool.query('SELECT count(*) FROM users')).rows[0].count, before);
});
