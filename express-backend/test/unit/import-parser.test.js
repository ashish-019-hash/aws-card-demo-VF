import test from 'node:test';
import assert from 'node:assert/strict';
import { signed } from '../../src/import-data.js';

// U-002 / F-003: DB-free fixed-width import parser coverage for COBOL zoned decimals.
test('U-002 F-003: fixed-width import parser preserves COBOL positive and negative zoned-decimal values', () => {
  assert.equal(signed('0000005047G'), 504.77);
  assert.equal(signed('0000009190}'), -919);
  assert.equal(signed('0000000010J'), -1.01);
  assert.equal(signed('0000000010R'), -1.09);
  assert.equal(signed('             '), 0);
  assert.equal(signed('0000001234{', 2), 123.4);
  assert.equal(signed('0000001234{', 1), 1234);
});
