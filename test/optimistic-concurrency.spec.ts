import { ConflictException } from '@nestjs/common';
import { assertExpectedVersion } from '../src/common/concurrency/optimistic-concurrency';

describe('optimistic concurrency', () => {
  it('accepts matching versions', () => expect(() => assertExpectedVersion(2, 2)).not.toThrow());
  it('maps stale versions to a conflict', () =>
    expect(() => assertExpectedVersion(1, 2)).toThrow(ConflictException));
});
