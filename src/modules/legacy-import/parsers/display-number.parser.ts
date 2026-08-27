export type DisplayEncoding = 'ebcdic' | 'ascii';
const asciiPositive = '{ABCDEFGHI';
const asciiNegative = '}JKLMNOPQR';

function error(message: string): never {
  throw new Error(`Invalid display number: ${message}`);
}
function format(digits: string, scale: number, negative: boolean): string {
  const whole =
    scale === 0
      ? digits
      : `${digits.slice(0, -scale) || '0'}.${digits.slice(-scale).padStart(scale, '0')}`;
  const normalized = whole.replace(/^0+(?=\d)/, '') || '0';
  return negative && !/^0(?:\.0+)?$/.test(normalized) ? `-${normalized}` : normalized;
}

export function parseUnsignedDisplay(bytes: Uint8Array, encoding: DisplayEncoding): string {
  let digits = '';
  for (const byte of bytes) {
    if (encoding === 'ebcdic') {
      if (byte < 0xf0 || byte > 0xf9) error(`EBCDIC byte 0x${byte.toString(16)} is not a digit`);
      digits += String(byte - 0xf0);
    } else {
      if (byte < 0x30 || byte > 0x39) error(`ASCII byte 0x${byte.toString(16)} is not a digit`);
      digits += String(byte - 0x30);
    }
  }
  return digits;
}

export function parseSignedDisplay(
  bytes: Uint8Array,
  encoding: DisplayEncoding,
  scale: number,
): string {
  if (bytes.length === 0) error('empty field');
  const leading = parseUnsignedDisplay(bytes.subarray(0, -1), encoding);
  const last = bytes.at(-1)!;
  let digit: number;
  let negative = false;
  if (encoding === 'ebcdic') {
    digit = last & 0x0f;
    const zone = last >> 4;
    if (digit > 9 || ![0x0c, 0x0d, 0x0f].includes(zone))
      error(`invalid EBCDIC sign byte 0x${last.toString(16)}`);
    negative = zone === 0x0d;
  } else {
    if (last >= 0x30 && last <= 0x39) digit = last - 0x30;
    else {
      const character = String.fromCharCode(last);
      const positive = asciiPositive.indexOf(character);
      const negativeDigit = asciiNegative.indexOf(character);
      if (positive >= 0) digit = positive;
      else if (negativeDigit >= 0) {
        digit = negativeDigit;
        negative = true;
      } else error(`invalid ASCII sign byte ${character}`);
    }
  }
  return format(`${leading}${digit}`, scale, negative);
}
