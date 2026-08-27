function realDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1]!;
}
export function parseLegacyDate(value: string): string {
  if (!realDate(value)) throw new Error(`Invalid legacy date: ${JSON.stringify(value)}`);
  return value;
}
export function parseLegacyTimestamp(
  raw: Uint8Array,
  decoded: string,
  kind: 'original' | 'processed',
  spaceByte: number,
): string | null {
  if (raw.length !== 26) throw new Error(`Invalid ${kind} timestamp width`);
  const blankOrLow = [...raw].every((byte) => byte === spaceByte || byte === 0x00);
  if (kind === 'processed' && blankOrLow) return null;
  if (kind === 'original' && blankOrLow) throw new Error('original timestamp cannot be blank');
  const full = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{6})$/.exec(decoded);
  if (full) {
    const [, date, hours, minutes, seconds] = full;
    if (!realDate(date!) || Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59)
      throw new Error(`Invalid timestamp: ${decoded}`);
    return decoded;
  }
  const dateOnly = decoded.slice(0, 10);
  const suffix = decoded.slice(10);
  if (
    realDate(dateOnly) &&
    suffix.length === 16 &&
    [...raw.subarray(10)].every((byte) => byte === spaceByte)
  )
    return `${dateOnly} 00:00:00.000000`;
  throw new Error(`Invalid ${kind} timestamp: ${JSON.stringify(decoded)}`);
}
