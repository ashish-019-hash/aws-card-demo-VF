import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export interface KeysetCursor {
  direction: 'forward' | 'backward';
  key: string;
}

export function encodeCursor(cursor: KeysetCursor, secret: string): string {
  const body = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function decodeCursor(value: string, secret: string): KeysetCursor {
  const [body, signature] = value.split('.');
  if (!body || !signature)
    throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Cursor is invalid.' });
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Cursor is invalid.' });
  }
  try {
    const decoded: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!isKeysetCursor(decoded)) throw new Error('invalid cursor payload');
    return decoded;
  } catch {
    throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Cursor is invalid.' });
  }
}

export function normalizeLimit(value?: number): number {
  if (value === undefined) return 10;
  if (!Number.isInteger(value) || value < 1 || value > 100)
    throw new BadRequestException({
      code: 'INVALID_LIMIT',
      message: 'Limit must be between 1 and 100.',
    });
  return value;
}

function isKeysetCursor(value: unknown): value is KeysetCursor {
  return (
    typeof value === 'object' &&
    value !== null &&
    ((value as Record<string, unknown>).direction === 'forward' ||
      (value as Record<string, unknown>).direction === 'backward') &&
    typeof (value as Record<string, unknown>).key === 'string'
  );
}
