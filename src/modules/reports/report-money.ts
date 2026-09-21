const CENTS_PATTERN = /^(-?)(\d+)\.(\d{2})$/;
const MAX_PRINTABLE_CENTS = 99_999_999_999n;

export interface FormattedMoney {
  text: string;
  overflow: boolean;
}

export function parseCents(value: string): bigint {
  const match = CENTS_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid report decimal: ${value}`);
  const [, sign, whole, fraction] = match;
  if (whole === undefined || fraction === undefined || sign === undefined)
    throw new Error(`Invalid report decimal: ${value}`);
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  return sign === '-' ? -cents : cents;
}

export function centsToString(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

export function formatDetailMoney(cents: bigint): FormattedMoney {
  return formatMoney(cents, ' ');
}

export function formatTotalMoney(cents: bigint): FormattedMoney {
  return formatMoney(cents, '+');
}

function formatMoney(cents: bigint, positiveSign: ' ' | '+'): FormattedMoney {
  const absolute = cents < 0n ? -cents : cents;
  if (absolute > MAX_PRINTABLE_CENTS) return { text: '*'.repeat(15), overflow: true };
  const body = `${(absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${(absolute % 100n).toString().padStart(2, '0')}`;
  return { text: `${cents < 0n ? '-' : positiveSign}${body.padStart(14, ' ')}`, overflow: false };
}
