import { isRetryablePostgresError } from '../src/common/database/postgres-retry';
import {
  isLegacyDate,
  isManualTransactionAmount,
} from '../src/common/validation/legacy-write.validators';
import { normalizeTransactionTimestamp } from '../src/common/validation/transaction-timestamp';
import { PAYMENT_TRANSACTION } from '../src/modules/payments/payment.constants';

describe('domain write helpers', () => {
  it('accepts real legacy dates and rejects impossible ones', () => {
    expect(isLegacyDate('2024-02-29')).toBe(true);
    expect(isLegacyDate('2023-02-29')).toBe(false);
  });

  it('normalizes permitted transaction timestamps to UTC microseconds', () => {
    expect(normalizeTransactionTimestamp('2026-08-27')).toBe('2026-08-27 00:00:00.000000');
    expect(normalizeTransactionTimestamp('2026-08-27T01:30:00.1+01:00')).toBe(
      '2026-08-27 00:30:00.100000',
    );
    expect(() => normalizeTransactionTimestamp('2026-08-27T01:30:00')).toThrow();
  });

  it('enforces manual transaction bounds without floating point', () => {
    expect(isManualTransactionAmount('999999999.99')).toBe(true);
    expect(isManualTransactionAmount('1000000000.00')).toBe(false);
  });

  it('classifies only serialization and deadlock failures as retryable', () => {
    expect(isRetryablePostgresError({ code: '40001' })).toBe(true);
    expect(isRetryablePostgresError({ code: '40P01' })).toBe(true);
    expect(isRetryablePostgresError({ code: '23505' })).toBe(false);
  });

  it('uses the COBOL bill-payment constants', () => {
    expect(PAYMENT_TRANSACTION).toEqual({
      typeCode: '02',
      categoryCode: '0002',
      source: 'POS TERM',
      description: 'BILL PAYMENT - ONLINE',
      merchantId: '999999999',
      merchantName: 'BILL PAYMENT',
      merchantCity: 'N/A',
      merchantZip: 'N/A',
    });
  });
});
