import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../src/common/auth/jwt-auth.guard';
import { ReportsController } from '../../src/modules/reports/reports.controller';

describe('ReportsController authentication', () => {
  it('requires JWT authentication for every report endpoint without applying an admin role guard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReportsController) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toHaveLength(1);
  });
});
