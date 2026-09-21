import { decodeCp037 } from '../decoders/cp037.decoder';
import {
  parseSignedDisplay,
  parseUnsignedDisplay,
  type DisplayEncoding,
} from './display-number.parser';
import { parseLegacyDate, parseLegacyTimestamp } from './temporal.parser';
import type { LegacyLayout } from '../schemas/legacy-layouts';

export interface ParsedRecord {
  readonly dataset: string;
  readonly record: number;
  readonly values: Record<string, string | null>;
  readonly source: Record<string, string>;
}
export function parseRecord(
  layout: LegacyLayout,
  record: { number: number; bytes: Buffer },
  encoding: DisplayEncoding,
): ParsedRecord {
  if (record.bytes.length !== layout.width)
    throw new Error(`${layout.dataset}: record ${record.number} width mismatch`);
  const values: Record<string, string | null> = {};
  const source: Record<string, string> = {};
  const spaceByte = encoding === 'ebcdic' ? 0x40 : 0x20;
  for (const field of layout.fields) {
    const raw = record.bytes.subarray(field.start, field.end);
    const decoded =
      encoding === 'ebcdic'
        ? decodeCp037(raw, {
            dataset: layout.dataset,
            record: record.number,
            field: field.name,
            offset: field.start,
          })
        : raw.toString('latin1');
    source[field.name] = decoded;
    if (field.name === 'filler') {
      values[field.name] = decoded;
      continue;
    }
    let value: string | null;
    switch (field.pic) {
      case 'unsigned':
        value = parseUnsignedDisplay(raw, encoding);
        break;
      case 'signed':
        value = parseSignedDisplay(raw, encoding, field.scale ?? 0);
        break;
      case 'date':
        value = parseLegacyDate(decoded);
        break;
      case 'timestamp-original':
        value = parseLegacyTimestamp(raw, decoded, 'original', spaceByte);
        break;
      case 'timestamp-processed':
        value = parseLegacyTimestamp(raw, decoded, 'processed', spaceByte);
        break;
      default:
        value = field.stripRight ? decoded.replace(/[ ]+$/g, '') : decoded;
    }
    if (field.nullWhenBlank && value !== null && value.trim() === '') value = null;
    values[field.destination ?? field.name] = value;
  }
  return { dataset: layout.dataset, record: record.number, values, source };
}
