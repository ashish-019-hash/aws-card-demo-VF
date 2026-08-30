const testDatabaseName = /(^|[-_])test($|[-_])|_test$/i;

export function databaseName(connectionString, variableName = 'TEST_DATABASE_URL') {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL connection URL.`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error(`${variableName} must use the postgres or postgresql protocol.`);
  const name = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!name) throw new Error(`${variableName} must include a database name.`);
  return name;
}

export function assertTestDatabaseName(name) {
  if (!testDatabaseName.test(name)) throw new Error(`Refusing to use non-test database "${name}". Use a database name containing "test" as a distinct marker.`);
  return name;
}

// This DB-free helper is shared by backend, E2E, and QA callers; it never falls back to DATABASE_URL.
export function validateTestDatabaseUrl(connectionString) {
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required; refusing to run tests against DATABASE_URL.');
  assertTestDatabaseName(databaseName(connectionString));
  return connectionString;
}
