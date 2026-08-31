import { ConflictException } from '@nestjs/common';

export function assertExpectedVersion(expectedVersion: number, actualVersion: number): void {
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1 ||
    expectedVersion !== actualVersion
  ) {
    throw new ConflictException({
      code: 'VERSION_CONFLICT',
      message: 'The resource was changed by another request.',
    });
  }
}
