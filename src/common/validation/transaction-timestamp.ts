import { BadRequestException } from '@nestjs/common';
import { isExactDate } from './exact.validators';

const RFC3339 = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/;

export function normalizeTransactionTimestamp(value: string): string {
  if (isExactDate(value)) return `${value} 00:00:00.000000`;
  const match = RFC3339.exec(value);
  if (!match) throw invalidTimestamp();
  const [, date, hour, minute, second, fraction = '', offset] = match;
  if (!date || !hour || !minute || !second || !offset || !isExactDate(date))
    throw invalidTimestamp();
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) throw invalidTimestamp();
  if (offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4, 6)) > 59))
    throw invalidTimestamp();
  const milliseconds = fraction.padEnd(6, '0').slice(0, 3);
  const parsed = Date.parse(`${date}T${hour}:${minute}:${second}.${milliseconds}${offset}`);
  if (Number.isNaN(parsed)) throw invalidTimestamp();
  const utc = new Date(parsed).toISOString().replace('T', ' ').replace('Z', '');
  const micros = fraction.padEnd(6, '0').slice(3);
  return `${utc.slice(0, 19)}.${utc.slice(20, 23)}${micros}`;
}

function invalidTimestamp(): BadRequestException {
  return new BadRequestException({
    code: 'INVALID_TIMESTAMP',
    message: 'Timestamp must be a real UTC date or RFC 3339 timestamp with offset.',
  });
}
