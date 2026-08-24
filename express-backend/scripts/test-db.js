import { URL } from 'node:url';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL is required; refusing to run tests against DATABASE_URL.');
const url = new URL(connectionString);
if (!/(^|[-_])test($|[-_])|_test$/i.test(url.pathname.slice(1))) throw new Error(`Refusing to use non-test database "${url.pathname.slice(1)}". Use a database name containing "test".`);
process.env.DATABASE_URL = connectionString;
await import('./migrate.js');
await import('../test/api.test.js');
