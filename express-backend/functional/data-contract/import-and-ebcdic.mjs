import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultFixtureRoot, fixtureSpec, parseData, seed } from '../../src/import-data.js';
import { pool } from '../../test-support/functional.js';

const ebcdicRoot = path.resolve(defaultFixtureRoot, '../EBCDIC');

async function fixtureCopy() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'carddemo-ascii-import-'));
  await Promise.all(Object.keys(fixtureSpec).map(name => fs.copyFile(path.join(defaultFixtureRoot, name), path.join(fixtureRoot, name))));
  return fixtureRoot;
}

async function replaceRecord(file, index, start, width, value) {
  const lines = (await fs.readFile(file, 'utf8')).split(/\r?\n/);
  const record = lines[index];
  assert.equal(value.length, width, 'replacement must preserve the fixed-width record layout');
  lines[index] = `${record.slice(0, start)}${value}${record.slice(start + width)}`;
  await fs.writeFile(file, lines.join('\n'));
}

function decodeCp037(bytes) {
  return [...bytes].map(byte => {
    if (byte >= 0xf0 && byte <= 0xf9) return String(byte - 0xf0);
    if (byte >= 0xc1 && byte <= 0xc9) return String.fromCharCode(65 + byte - 0xc1);
    if (byte >= 0xd1 && byte <= 0xd9) return String.fromCharCode(74 + byte - 0xd1);
    if (byte >= 0xe2 && byte <= 0xe9) return String.fromCharCode(83 + byte - 0xe2);
    if (byte >= 0x81 && byte <= 0x89) return String.fromCharCode(97 + byte - 0x81);
    if (byte >= 0x91 && byte <= 0x99) return String.fromCharCode(106 + byte - 0x91);
    if (byte >= 0xa2 && byte <= 0xa9) return String.fromCharCode(115 + byte - 0xa2);
    return new Map([[0x40, ' '], [0x4b, '.'], [0x4d, '('], [0x5d, ')'], [0x60, '-'], [0x6b, ','], [0x7a, ':'], [0x7d, "'"], [0xc0, '{'], [0xd0, '}']]).get(byte) ?? `<${byte.toString(16)}>`;
  }).join('');
}

test('F-003 imports every ASCII fixed-width fixture and aborts before database work on a parse error', async () => {
  const data = parseData();
  assert.deepEqual(
    Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length])),
    { accounts: 50, cards: 50, xrefs: 50, customers: 50, transactions: 300, types: 7, categories: 18, categoryBalances: 50, disclosureGroups: 51 }
  );
  assert.equal(data.accounts[0].id, '00000000001');
  assert.equal(data.transactions[0].amount, 504.77);

  const fixtureRoot = await fixtureCopy();
  try {
    const accountsBefore = await pool.query('SELECT count(*) FROM accounts');
    const file = path.join(fixtureRoot, 'acctdata.txt');
    const [first, ...rest] = (await fs.readFile(file, 'utf8')).split(/\r?\n/);
    await fs.writeFile(file, `${first.slice(0, -1)}\n${rest.join('\n')}`);
    await assert.rejects(seed(pool, { fixtureRoot }), /acctdata\.txt record 1 must be 300 bytes; got 299/);
    assert.deepEqual(await pool.query('SELECT count(*) FROM accounts'), accountsBefore, 'parsing must complete before a seed transaction begins');
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('F-003 rolls back writes when a later ASCII fixture record violates a database constraint', async () => {
  const fixtureRoot = await fixtureCopy();
  try {
    const before = await pool.query('SELECT zip FROM accounts WHERE id=$1', ['00000000001']);
    await replaceRecord(path.join(fixtureRoot, 'acctdata.txt'), 0, 102, 10, 'ROLLBACK01');
    await replaceRecord(path.join(fixtureRoot, 'carddata.txt'), 0, 16, 11, '99999999999');

    await assert.rejects(seed(pool, { fixtureRoot }), { code: '23503' });
    assert.deepEqual(await pool.query('SELECT zip FROM accounts WHERE id=$1', ['00000000001']), before, 'the changed account must not survive a failed card insert');
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('F-004 normalizes CP037 records to their ASCII fixtures and preserves source aliases and security-file size', async () => {
  const pairs = [
    ['AWS.M2.CARDDEMO.ACCTDATA.PS', 'acctdata.txt', 300], ['AWS.M2.CARDDEMO.CARDDATA.PS', 'carddata.txt', 150],
    ['AWS.M2.CARDDEMO.CARDXREF.PS', 'cardxref.txt', 50], ['AWS.M2.CARDDEMO.CUSTDATA.PS', 'custdata.txt', 500],
    ['AWS.M2.CARDDEMO.DALYTRAN.PS', 'dailytran.txt', 350], ['AWS.M2.CARDDEMO.DISCGRP.PS', 'discgrp.txt', 50],
    ['AWS.M2.CARDDEMO.TCATBALF.PS', 'tcatbal.txt', 50], ['AWS.M2.CARDDEMO.TRANCATG.PS', 'trancatg.txt', 60],
    ['AWS.M2.CARDDEMO.TRANTYPE.PS', 'trantype.txt', 60]
  ];
  for (const [ebcdicName, asciiName, width] of pairs) {
    const bytes = await fs.readFile(path.join(ebcdicRoot, ebcdicName));
    const normalized = Array.from({ length: bytes.length / width }, (_, index) => decodeCp037(bytes.subarray(index * width, (index + 1) * width)).trimEnd());
    const ascii = (await fs.readFile(path.join(defaultFixtureRoot, asciiName), 'utf8')).split(/\r?\n/).filter(Boolean).map(line => line.trimEnd());
    assert.equal(bytes.length % width, 0, `${ebcdicName} must have complete ${width}-byte records`);
    assert.equal(normalized.length, ascii.length);
    // Two legacy records intentionally differ from the normalized ASCII export; pin the discrepancies rather than hiding them.
    const differences = normalized.flatMap((record, index) => record === ascii[index] ? [] : [index + 1]);
    const expectedDifferences = ebcdicName === 'AWS.M2.CARDDEMO.ACCTDATA.PS' ? [49] : ebcdicName === 'AWS.M2.CARDDEMO.DISCGRP.PS' ? [34] : [];
    assert.deepEqual(differences, expectedDifferences, `${ebcdicName} normalized content must match its ASCII fixture except documented source divergences`);
  }
  const accountBytes = await fs.readFile(path.join(ebcdicRoot, 'AWS.M2.CARDDEMO.ACCTDATA.PS'));
  const transactionBytes = await fs.readFile(path.join(ebcdicRoot, 'AWS.M2.CARDDEMO.DALYTRAN.PS'));
  const alias = await fs.readFile(path.join(ebcdicRoot, 'AWS.M2.CARDDEMO.ACCDATA.PS'));
  const userSecurity = await fs.readFile(path.join(ebcdicRoot, 'AWS.M2.CARDDEMO.USRSEC.PS'));
  assert.deepEqual(alias, accountBytes, 'legacy ACCDATA and ACCTDATA files are byte-for-byte aliases');
  assert.equal(userSecurity.length, 800, 'USRSEC retains ten 80-byte fixed records');
  assert.equal(decodeCp037(accountBytes.subarray(0, 11)), '00000000001');
  assert.equal(accountBytes[23], 0xc0, 'CP037 { must remain the positive zoned-decimal overpunch byte');
  assert.equal(decodeCp037(transactionBytes.subarray(132, 143)), '0000005047G');
  assert.ok(!accountBytes.includes(0x0a) && !transactionBytes.includes(0x0a), 'EBCDIC sources are fixed-length records without ASCII line separators');
});
