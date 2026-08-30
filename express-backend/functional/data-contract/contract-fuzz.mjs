import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { agent, login } from '../../test-support/functional.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function openapi() {
  return YAML.parse(await fs.readFile(path.join(backendRoot, 'openapi.yaml'), 'utf8'));
}

test('F-024 bounded schema-derived negative contract fuzzing rejects malformed documented identifiers and request bodies', async () => {
  const document = await openapi();
  const client = agent();
  await login(client);
  const accountPattern = new RegExp(document.components.parameters.AccountId.schema.pattern.replaceAll('\\\\', '\\'));
  assert.equal(accountPattern.test('00000000001'), true);
  assert.equal(accountPattern.test('not-an-account'), false);

  const cases = [
    [() => client.get('/api/accounts/not-an-account'), 422, 'VALIDATION_ERROR'],
    [() => client.get('/api/cards/not-a-card'), 422, 'VALIDATION_ERROR'],
    [() => client.get('/api/transactions/not-a-transaction'), 422, 'VALIDATION_ERROR'],
    [() => client.get('/api/cards?limit=0'), 400, 'INVALID_LIMIT'],
    [() => client.get('/api/lookup/transaction-categories?typeCode=A'), 422, 'VALIDATION_ERROR'],
    [() => client.post('/api/auth/sign-in').send({ userId: 'USER0001' }), 422, 'VALIDATION_ERROR']
  ];
  for (const [request, status, code] of cases) {
    const response = await request().expect(status);
    assert.equal(response.body.error.code, code);
    assert.equal(typeof response.body.error.message, 'string');
  }
});
