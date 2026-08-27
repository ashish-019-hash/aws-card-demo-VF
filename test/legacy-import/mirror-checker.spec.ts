import { readFileSync } from 'fs';
import { join } from 'path';
import { parseRecord } from '../../src/modules/legacy-import/parsers/record.parser';
import {
  readAsciiRecords,
  readEbcdicRecords,
} from '../../src/modules/legacy-import/readers/fixed-record.reader';
import { checkMirror } from '../../src/modules/legacy-import/reconciliation/mirror-checker';
import { layoutFor } from '../../src/modules/legacy-import/schemas/legacy-layouts';
import { importableDatasets } from '../../src/modules/legacy-import/schemas/source-catalog';
import type { ParsedSources } from '../../src/modules/legacy-import/validators/import.validator';

const root = join(process.cwd(), '00.phase-1-input/data');
function load(encoding: 'ebcdic' | 'ascii'): ParsedSources {
  const sources: ParsedSources = {};
  for (const entry of importableDatasets()) {
    if (encoding === 'ascii' && !entry.asciiName) continue;
    const file = join(
      root,
      encoding === 'ebcdic' ? 'EBCDIC' : 'ASCII',
      encoding === 'ebcdic' ? entry.canonicalName : entry.asciiName!,
    );
    const contents = readFileSync(file);
    const records =
      encoding === 'ebcdic'
        ? readEbcdicRecords(contents, entry.canonicalWidth, entry.dataset)
        : readAsciiRecords(
            contents,
            entry.asciiWidth ?? entry.canonicalWidth,
            entry.dataset,
            entry.dataset === 'cardXrefs',
          );
    sources[entry.dataset] = records.map((record) =>
      parseRecord(
        layoutFor(entry.dataset),
        { number: record.number, bytes: record.normalizedBytes ?? record.bytes },
        encoding,
      ),
    );
  }
  return sources;
}
describe('ASCII mirror checker', () => {
  it('only accepts reviewed fixture divergences', () => {
    const result = checkMirror(load('ebcdic'), load('ascii'));
    expect(result).toEqual({
      normalizedXrefs: 50,
      divergenceIds: [
        'ACCTDATA_00000000049_ADDRESS_ZIP',
        'CARDXREF_ASCII_FILLER_OMITTED',
        'DISCGRP_DEFAULT_07_0001_INTEREST_RATE',
      ],
      differences: 2,
      users: 'missing',
    });
  });
});
