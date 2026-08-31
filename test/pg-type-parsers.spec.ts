import { types } from 'pg';
import { registerPgTypeParsers } from '../src/database/pg-type-parsers';

describe('PostgreSQL type parsers', () => {
  it('keeps date, timestamps, and numeric values as exact strings', () => {
    registerPgTypeParsers();
    const parser = (oid: number): ((value: string) => string) =>
      types.getTypeParser(oid) as (value: string) => string;
    expect(parser(1082)('2026-08-27')).toBe('2026-08-27');
    expect(parser(1114)('2026-08-27 12:30:00.123456')).toBe('2026-08-27 12:30:00.123456');
    expect(parser(1184)('2026-08-27 12:30:00+00')).toBe('2026-08-27 12:30:00+00');
    expect(parser(1700)('000123.40')).toBe('000123.40');
  });
});
