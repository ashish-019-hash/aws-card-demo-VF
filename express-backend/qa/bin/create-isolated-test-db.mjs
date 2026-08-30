import { createIsolatedTestDatabase } from './isolated-test-db.mjs';

console.log(`Created ${await createIsolatedTestDatabase()}`);
