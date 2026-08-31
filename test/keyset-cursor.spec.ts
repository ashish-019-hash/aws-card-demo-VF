import { BadRequestException } from '@nestjs/common';
import { decodeCursor, encodeCursor, normalizeLimit } from '../src/common/cursor/keyset-cursor';

describe('keyset cursor', () => {
  const secret = 'a-long-test-secret-that-is-not-used-in-production';
  it('round trips a signed cursor', () => {
    const value = encodeCursor({ direction: 'forward', key: '00000001' }, secret);
    expect(decodeCursor(value, secret)).toEqual({ direction: 'forward', key: '00000001' });
  });
  it('rejects a tampered cursor', () => {
    expect(() => decodeCursor('bad.cursor', secret)).toThrow(BadRequestException);
  });
  it('uses safe pagination limits', () => {
    expect(normalizeLimit()).toBe(10);
    expect(normalizeLimit(100)).toBe(100);
    expect(() => normalizeLimit(101)).toThrow(BadRequestException);
  });
});
