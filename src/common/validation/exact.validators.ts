const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/;

export function isExactId(value: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(value);
}

export function isExactDecimal(value: string, precision: number, scale: number): boolean {
  return new RegExp(`^-?\\d{1,${precision - scale}}\\.\\d{${scale}}$`).test(value);
}

export function isExactDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isExactTimestamp(value: string): boolean {
  return TIMESTAMP_PATTERN.test(value) && isExactDate(value.slice(0, 10));
}
