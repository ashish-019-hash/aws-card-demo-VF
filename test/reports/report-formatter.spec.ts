import { createHash } from 'node:crypto';
import { formatReport } from '../../src/modules/reports/report-formatter';
import {
  formatDetailMoney,
  formatTotalMoney,
  parseCents,
} from '../../src/modules/reports/report-money';
import type { ReportRow } from '../../src/modules/reports/report-types';

const job = {
  reportKind: 'custom' as const,
  timestampMode: 'processed-or-original' as const,
  rangeStart: '2024-02-01',
  rangeEnd: '2024-02-29',
};
const row = (id: number, account = '00000000001'): ReportRow => ({
  id: id.toString().padStart(16, '0'),
  accountId: account,
  cardNumber: '4000000000000001',
  typeCode: '01',
  typeDescription: 'Purchase',
  categoryCode: '0001',
  categoryDescription: 'General',
  source: 'API',
  amount: '1.23',
  effectiveTs: '2024-02-01 00:00:00.000000',
});

describe('report formatter', () => {
  it('creates an empty five-line ASCII artifact without trailing LF', () => {
    const report = formatReport(job, []);
    expect(report.bytes.length).toBe(669);
    expect(report.bytes.toString('ascii').endsWith('\n')).toBe(false);
    expect(report.bytes.toString('ascii')).not.toMatch(/[\r\f]/);
    expect(report.bytes.toString('ascii').split('\n')).toHaveLength(5);
    expect(
      report.bytes
        .toString('ascii')
        .split('\n')
        .every((line) => Buffer.byteLength(line, 'ascii') === 133),
    ).toBe(true);
    expect(report.sha256).toBe(createHash('sha256').update(report.bytes).digest('hex'));
  });

  it('keeps page/account/grand total ordering at a one-row end boundary', () => {
    const report = formatReport(job, [row(1)]);
    const lines = report.bytes.toString('ascii').split('\n');
    expect(lines).toHaveLength(7);
    expect(lines[3]).toContain('0000000000000001');
    expect(lines[4]).toContain('Account Total');
    expect(lines[5]).toContain('Page Total');
    expect(lines.at(-1)).toContain('Grand Total');
  });

  it('opens a second page after 55 detail rows and preserves widths', () => {
    const report = formatReport(
      job,
      Array.from({ length: 56 }, (_, index) => row(index + 1)),
    );
    expect(report.bytes.toString('ascii').split('\n')).toHaveLength(66);
    expect(report.metadata.pageCount).toBe(2);
    expect(report.bytes.length).toBe(8843);
  });

  it('uses exact bigint cents masks and marks overflow', () => {
    expect(parseCents('-1.23')).toBe(-123n);
    expect(formatDetailMoney(0n).text).toBe('           0.00');
    expect(formatTotalMoney(123n).text).toBe('+          1.23');
    expect(formatDetailMoney(100_000_000_000n)).toEqual({ text: '*'.repeat(15), overflow: true });
  });
});
