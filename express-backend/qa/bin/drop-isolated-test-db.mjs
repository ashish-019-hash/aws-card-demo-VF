import { dropIsolatedTestDatabase } from './isolated-test-db.mjs';

console.log(`Dropped ${await dropIsolatedTestDatabase()}`);
