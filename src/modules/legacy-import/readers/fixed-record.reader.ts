export interface FixedRecord {
  readonly number: number;
  readonly bytes: Buffer;
  readonly normalizedBytes?: Buffer;
}
export class FixedRecordError extends Error {}

export function readEbcdicRecords(contents: Buffer, width: number, dataset: string): FixedRecord[] {
  if (contents.length % width !== 0)
    throw new FixedRecordError(`${dataset}: ${contents.length} bytes is not divisible by ${width}`);
  const records: FixedRecord[] = [];
  for (let offset = 0; offset < contents.length; offset += width)
    records.push({ number: records.length + 1, bytes: contents.subarray(offset, offset + width) });
  return records;
}

export function readAsciiRecords(
  contents: Buffer,
  width: number,
  dataset: string,
  normalizeXref = false,
): FixedRecord[] {
  if (contents.length === 0 || contents.at(-1) !== 0x0a)
    throw new FixedRecordError(`${dataset}: ASCII file must end with LF`);
  if (contents.includes(0x0d))
    throw new FixedRecordError(`${dataset}: CR is not a valid ASCII record terminator`);
  const records: FixedRecord[] = [];
  let start = 0;
  for (let offset = 0; offset < contents.length; offset += 1) {
    if (contents[offset] !== 0x0a) continue;
    const bytes = contents.subarray(start, offset);
    if (bytes.length !== width)
      throw new FixedRecordError(
        `${dataset}: record ${records.length + 1} has ${bytes.length} bytes, expected ${width}`,
      );
    records.push({
      number: records.length + 1,
      bytes,
      normalizedBytes: normalizeXref ? Buffer.concat([bytes, Buffer.alloc(14, 0x20)]) : undefined,
    });
    start = offset + 1;
  }
  return records;
}
