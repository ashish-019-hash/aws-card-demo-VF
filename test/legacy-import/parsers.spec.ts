import { CP037_TABLE } from '../../src/modules/legacy-import/decoders/cp037.table';
import {
  assertCp037Adapter,
  decodeCp037,
} from '../../src/modules/legacy-import/decoders/cp037.decoder';
import { parseSignedDisplay } from '../../src/modules/legacy-import/parsers/display-number.parser';
import { parseLegacyTimestamp } from '../../src/modules/legacy-import/parsers/temporal.parser';
import {
  assertLayout,
  LEGACY_LAYOUTS,
} from '../../src/modules/legacy-import/schemas/legacy-layouts';

describe('legacy binary parsers', () => {
  it('ships a complete CP037 adapter', () => {
    expect(CP037_TABLE).toHaveLength(256);
    expect(decodeCp037(Buffer.from([0x40, 0xf0, 0xf9, 0xc1, 0xd1]))).toBe(' 09AJ');
    expect(assertCp037Adapter).not.toThrow();
  });

  it('parses EBCDIC and ASCII zoned numbers without floats', () => {
    expect(parseSignedDisplay(Buffer.from([0xf0, 0xf0, 0xf1, 0xf2, 0xd3]), 'ebcdic', 2)).toBe(
      '-1.23',
    );
    expect(parseSignedDisplay(Buffer.from('0012L'), 'ascii', 2)).toBe('-1.23');
    expect(parseSignedDisplay(Buffer.from([0xf0, 0xf0, 0xd0]), 'ebcdic', 2)).toBe('0.00');
  });

  it('accepts exact timestamp forms only', () => {
    expect(
      parseLegacyTimestamp(
        Buffer.from('2022-06-10'.padEnd(26, ' ')),
        '2022-06-10'.padEnd(26, ' '),
        'original',
        0x20,
      ),
    ).toBe('2022-06-10 00:00:00.000000');
    expect(parseLegacyTimestamp(Buffer.alloc(26), '\0'.repeat(26), 'processed', 0x20)).toBeNull();
    expect(() =>
      parseLegacyTimestamp(
        Buffer.from('2022-02-30'.padEnd(26, ' ')),
        '2022-02-30'.padEnd(26, ' '),
        'original',
        0x20,
      ),
    ).toThrow('Invalid original timestamp');
  });

  it('keeps every declared layout contiguous and exact', () => {
    Object.values(LEGACY_LAYOUTS)
      .filter((layout) => layout.fields.length > 0)
      .forEach(assertLayout);
  });
});
