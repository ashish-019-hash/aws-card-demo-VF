import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { agent, login } from '../../test-support/functional.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const openapiPath = path.join(backendRoot, 'openapi.yaml');
const expressToOpenApi = route => route.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

async function contract() {
  return YAML.parse(await fs.readFile(openapiPath, 'utf8'));
}

async function implementedRoutes() {
  const source = await fs.readFile(path.join(backendRoot, 'src/app.js'), 'utf8');
  return new Map([...source.matchAll(/app\.(get|post|patch|delete)\('([^']+)'/g)].map(([, method, route]) => [`${method.toUpperCase()} ${expressToOpenApi(route)}`, true]));
}

test('F-008 OpenAPI and Express route inventories are equal in both directions', async () => {
  const document = await contract();
  assert.equal(document.openapi, '3.0.3');
  assert.equal(document.components.securitySchemes.sessionCookie.in, 'cookie');
  assert.equal(document.components.securitySchemes.sessionCookie.name, 'carddemo.sid');

  const documented = new Set(Object.entries(document.paths).flatMap(([route, operations]) => Object.keys(operations)
    .filter(method => ['get', 'post', 'patch', 'delete'].includes(method))
    .map(method => `${method.toUpperCase()} ${route}`)));
  const implemented = new Set((await implementedRoutes()).keys());
  assert.deepEqual([...documented].sort(), [...implemented].sort(), 'every documented route must exist and every Express route must be documented');

  for (const [route, operations] of Object.entries(document.paths)) for (const [method, operation] of Object.entries(operations)) {
    if (!['get', 'post', 'patch', 'delete'].includes(method)) continue;
    assert.ok(operation.responses && Object.keys(operation.responses).length, `${method.toUpperCase()} ${route} must document responses`);
    if (route.startsWith('/api/') && route !== '/api/auth/sign-in') assert.deepEqual(operation.security, [{ sessionCookie: [] }], `${method.toUpperCase()} ${route} must declare session authentication`);
  }
  assert.ok(document.components.schemas.SignIn.required.includes('userId'));
  assert.ok(document.components.schemas.SignIn.required.includes('password'));
  for (const [route, operations] of Object.entries(document.paths)) for (const [method, operation] of Object.entries(operations)) {
    if (!['post', 'patch'].includes(method) || !operation.requestBody) continue;
    assert.deepEqual(operation.responses['413'].$ref, '#/components/responses/PayloadTooLarge', `${method.toUpperCase()} ${route} must document the JSON body limit`);
  }
});

test('F-008 representative documented request and response schemas conform at runtime', async () => {
  const client = agent();
  const signedIn = await login(client);
  assert.deepEqual(Object.keys(signedIn.body.data).sort(), ['menu', 'user']);
  assert.equal(signedIn.body.data.user.id, 'USER0001');
  assert.equal('passwordHash' in signedIn.body.data.user, false);

  const account = await client.get('/api/accounts/00000000001').expect(200);
  assert.match(account.headers.etag, /^"\d+"$/);
  assert.equal(account.body.data.id, '00000000001');
  assert.ok(Array.isArray(account.body.data.customers));
  assert.ok(Array.isArray(account.body.data.cards));
  await client.get('/api/cards?limit=1').expect(200).expect(response => {
    assert.deepEqual(Object.keys(response.body.data).sort(), ['items', 'page']);
    assert.equal(response.body.data.page.limit, 1);
  });
});
