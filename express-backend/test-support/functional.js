import { after, before, beforeEach } from 'node:test';
import request from 'supertest';
import { createPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { seed } from '../src/import-data.js';
import { assertConnectedTestDatabase, validateTestDatabaseUrl } from '../scripts/test-db.js';

const databaseUrl = process.env.DATABASE_URL;
validateTestDatabaseUrl(databaseUrl);

export const pool = createPool({ connectionString: databaseUrl });
export let app;

before(async () => {
  await assertConnectedTestDatabase(pool, databaseUrl);
  app = createApp({ pool, sessionSecret: 'test-session-secret-that-is-long-enough-for-tests' });
});
beforeEach(async () => {
  await pool.query('TRUNCATE reports,idempotency,sessions,transactions,category_balances,disclosure_groups,card_xrefs,cards,customers,accounts,transaction_categories,transaction_types,users RESTART IDENTITY CASCADE');
  await seed(pool);
});
after(async () => pool.end());

export const agent = () => request.agent(app);
export async function login(client, userId = 'USER0001', password = 'User123!') {
  return client.post('/api/auth/sign-in').send({ userId, password }).expect(200);
}
export async function firstCard(client, accountId = '00000000001') {
  return (await client.get(`/api/cards?accountId=${accountId}&limit=1`).expect(200)).body.data.items[0];
}
export const transactionBody = cardNumber => ({ cardNumber, typeCode: '01', categoryCode: '0001', source: 'API', description: 'test purchase', amount: 12.34 });
