import { BadRequestException } from '@nestjs/common';
import { ReportRangeService } from '../../src/modules/reports/report-range.service';

describe('ReportRangeService', () => {
  const ranges = new ReportRangeService();
  it.each([
    [
      { kind: 'monthly', asOfDate: '2024-02-15' },
      { rangeStart: '2024-02-01', rangeEnd: '2024-02-29' },
    ],
    [
      { kind: 'monthly', asOfDate: '2023-12-01' },
      { rangeStart: '2023-12-01', rangeEnd: '2023-12-31' },
    ],
    [
      { kind: 'yearly', asOfDate: '2024-06-01' },
      { rangeStart: '2024-01-01', rangeEnd: '2024-12-31' },
    ],
    [
      { kind: 'custom', rangeStart: '2024-01-02', rangeEnd: '2024-01-03' },
      { rangeStart: '2024-01-02', rangeEnd: '2024-01-03' },
    ],
  ])('resolves inclusive report range %#', (request, expected) =>
    expect(ranges.resolve(request as never)).toEqual(expected),
  );
  it.each([
    { kind: 'monthly', asOfDate: '2023-02-29' },
    { kind: 'custom', rangeStart: '2024-02-02', rangeEnd: '2024-02-01' },
  ])('rejects invalid range %#', (request) =>
    expect(() => ranges.resolve(request as never)).toThrow(BadRequestException),
  );
});
