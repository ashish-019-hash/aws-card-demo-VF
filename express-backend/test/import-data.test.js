import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultFixtureRoot, fixtureSpec, parseData, seed, signed } from '../src/import-data.js';

async function fixtureCopy() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'carddemo-fixtures-'));
  await Promise.all(Object.keys(fixtureSpec).map(name => fs.copyFile(path.join(defaultFixtureRoot, name), path.join(fixtureRoot, name))));
  return fixtureRoot;
}

test('fixed-width importer preserves source identifiers, blank timestamps, and zoned decimals', () => {
  const data = parseData();
  assert.equal(data.accounts.length, 50);
  assert.equal(data.accounts[0].id, '00000000001');
  assert.match(data.cards[0].number, /^\d{16}$/);
  assert.ok(data.transactions.some(transaction => transaction.processedAt === ''));
  assert.equal(signed('0000005047G'), 504.77);
  assert.equal(signed('0000009190}'), -919);
});

test('fixed-width importer reports the file, record, and expected width for malformed fixtures', async () => {
  const fixtureRoot = await fixtureCopy();
  try {
    const file = path.join(fixtureRoot, 'acctdata.txt');
    const [first, ...rest] = (await fs.readFile(file, 'utf8')).split(/\r?\n/);
    await fs.writeFile(file, `${first.slice(0, -1)}\n${rest.join('\n')}`);
    assert.throws(() => parseData({ fixtureRoot }), /acctdata\.txt record 1 must be 300 bytes; got 299/);
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('seed accepts a fixtureRoot override', async () => {
  const fixtureRoot = await fixtureCopy();
  const queries = [];
  const pool = {
    connect: async () => ({
      query: async (sql, values) => {
        queries.push({ sql, values });
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
        return { rows: [] };
      },
      release: () => {}
    })
  };
  try {
    const accountFile = path.join(fixtureRoot, 'acctdata.txt');
    const [first, ...rest] = (await fs.readFile(accountFile, 'utf8')).split(/\r?\n/);
    const injectedAccountId = '99999999999';
    await fs.writeFile(accountFile, `${injectedAccountId}${first.slice(11)}\n${rest.join('\n')}`);

    const data = await seed(pool, { fixtureRoot });
    assert.equal(data.accounts.length, 50);
    assert.equal(data.accounts[0].id, injectedAccountId);
    assert.ok(queries.some(({ sql, values }) => sql.startsWith('INSERT INTO accounts') && values[0] === injectedAccountId));
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});
