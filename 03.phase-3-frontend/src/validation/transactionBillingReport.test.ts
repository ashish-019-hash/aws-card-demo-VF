import { describe, expect, it } from 'vitest'
import { billPaymentMessages, billPaymentSchema } from './billPayment'
import { reportMessages, reportSchema, validateCustomDate } from './report'
import { isRealIsoDate, transactionAddMessages, transactionAddSchema } from './transactionAdd'
import { transactionListFilterMessages, transactionListFilterSchema } from './transactionListFilter'
import { transactionSearchMessages, transactionSearchSchema } from './transactionSearch'

/** First error message reported for a field, or undefined when valid. */
function firstError(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }, field: string): string | undefined {
  if (result.success) return undefined
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message
}

const validAdd = {
  accountId: '10000000001',
  cardNumber: '',
  transactionTypeCode: '01',
  transactionCategoryCode: '0001',
  source: 'POS TERM',
  description: 'TEST PURCHASE',
  amount: '+00000086.42',
  originationTimestamp: '2026-10-06',
  processingTimestamp: '2026-10-07',
  merchantId: '411000101',
  merchantName: 'TEST MERCHANT',
  merchantCity: 'AUSTIN',
  merchantZip: '78701',
  confirmation: '',
}

describe('transactionListFilterSchema (RULE-VAL-051)', () => {
  it('accepts a blank filter (list from the beginning)', () => {
    expect(transactionListFilterSchema.safeParse({ transactionId: '' }).success).toBe(true)
    expect(transactionListFilterSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a numeric filter and rejects a non-numeric one', () => {
    expect(transactionListFilterSchema.safeParse({ transactionId: '102' }).success).toBe(true)
    const result = transactionListFilterSchema.safeParse({ transactionId: '12AB' })
    expect(firstError(result, 'transactionId')).toBe(transactionListFilterMessages.tranIdNotNumeric)
  })
})

describe('transactionSearchSchema (RULE-VAL-052)', () => {
  it('requires a transaction ID', () => {
    const result = transactionSearchSchema.safeParse({ transactionId: '   ' })
    expect(firstError(result, 'transactionId')).toBe(transactionSearchMessages.tranIdEmpty)
    expect(transactionSearchSchema.safeParse({ transactionId: '104' }).success).toBe(true)
  })
})

describe('transactionAddSchema', () => {
  it('accepts a fully valid transaction', () => {
    expect(transactionAddSchema.safeParse(validAdd).success).toBe(true)
  })

  it('requires the account or the card number (RULE-VAL-054)', () => {
    const result = transactionAddSchema.safeParse({ ...validAdd, accountId: '', cardNumber: '' })
    expect(firstError(result, 'accountId')).toBe(transactionAddMessages.accountOrCardRequired)
    expect(transactionAddSchema.safeParse({ ...validAdd, accountId: '', cardNumber: '4000123456789010' }).success).toBe(true)
  })

  it('requires numeric key fields when supplied (RULE-VAL-055)', () => {
    expect(firstError(transactionAddSchema.safeParse({ ...validAdd, accountId: '1000000000A' }), 'accountId')).toBe(
      transactionAddMessages.accountIdNotNumeric,
    )
    // The card is only validated when no account is entered — legacy account
    // precedence: an entered account overwrites the card from the xref.
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, accountId: '', cardNumber: '4000-1234' }), 'cardNumber'),
    ).toBe(transactionAddMessages.cardNumberNotNumeric)
    expect(transactionAddSchema.safeParse({ ...validAdd, cardNumber: '4000-1234' }).success).toBe(true)
  })

  it('requires every data field with its legacy message (RULE-VAL-057)', () => {
    const empties: Array<[keyof typeof validAdd, string]> = [
      ['transactionTypeCode', transactionAddMessages.typeCodeEmpty],
      ['transactionCategoryCode', transactionAddMessages.categoryCodeEmpty],
      ['source', transactionAddMessages.sourceEmpty],
      ['description', transactionAddMessages.descriptionEmpty],
      ['amount', transactionAddMessages.amountEmpty],
      ['originationTimestamp', transactionAddMessages.origDateEmpty],
      ['processingTimestamp', transactionAddMessages.procDateEmpty],
      ['merchantId', transactionAddMessages.merchantIdEmpty],
      ['merchantName', transactionAddMessages.merchantNameEmpty],
      ['merchantCity', transactionAddMessages.merchantCityEmpty],
      ['merchantZip', transactionAddMessages.merchantZipEmpty],
    ]
    for (const [field, message] of empties) {
      const result = transactionAddSchema.safeParse({ ...validAdd, [field]: '  ' })
      expect(firstError(result, field), field).toBe(message)
    }
  })

  it('requires numeric type and category codes (RULE-VAL-058)', () => {
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, transactionTypeCode: 'AB' }), 'transactionTypeCode'),
    ).toBe(transactionAddMessages.typeCodeNotNumeric)
    expect(
      firstError(
        transactionAddSchema.safeParse({ ...validAdd, transactionCategoryCode: '12A4' }),
        'transactionCategoryCode',
      ),
    ).toBe(transactionAddMessages.categoryCodeNotNumeric)
  })

  it('requires the exact signed amount format (RULE-VAL-059)', () => {
    for (const bad of ['86.42', '-86.42', '+0000086.42', '+00000086.4', '+00000086', '00000086.42']) {
      expect(firstError(transactionAddSchema.safeParse({ ...validAdd, amount: bad }), 'amount'), bad).toBe(
        transactionAddMessages.amountFormat,
      )
    }
    expect(transactionAddSchema.safeParse({ ...validAdd, amount: '-00000950.00' }).success).toBe(true)
  })

  it('requires YYYY-MM-DD format and a real calendar date (RULE-VAL-060)', () => {
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, originationTimestamp: '10/06/2026' }), 'originationTimestamp'),
    ).toBe(transactionAddMessages.origDateFormat)
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, processingTimestamp: '2026-10-7' }), 'processingTimestamp'),
    ).toBe(transactionAddMessages.procDateFormat)
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, originationTimestamp: '2026-02-30' }), 'originationTimestamp'),
    ).toBe(transactionAddMessages.origDateNotValid)
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, processingTimestamp: '2026-13-01' }), 'processingTimestamp'),
    ).toBe(transactionAddMessages.procDateNotValid)
    // Leap-day handling.
    expect(transactionAddSchema.safeParse({ ...validAdd, originationTimestamp: '2024-02-29' }).success).toBe(true)
    expect(
      firstError(transactionAddSchema.safeParse({ ...validAdd, originationTimestamp: '2026-02-29' }), 'originationTimestamp'),
    ).toBe(transactionAddMessages.origDateNotValid)
  })

  it('requires a numeric merchant ID (RULE-VAL-061)', () => {
    expect(firstError(transactionAddSchema.safeParse({ ...validAdd, merchantId: '41100A101' }), 'merchantId')).toBe(
      transactionAddMessages.merchantIdNotNumeric,
    )
  })
})

describe('isRealIsoDate', () => {
  it('accepts only real YYYY-MM-DD calendar dates', () => {
    expect(isRealIsoDate('2026-10-06')).toBe(true)
    expect(isRealIsoDate('2026-04-31')).toBe(false)
    expect(isRealIsoDate('2026-00-10')).toBe(false)
    expect(isRealIsoDate('2026-1-6')).toBe(false)
  })
})

describe('billPaymentSchema (RULE-VAL-064)', () => {
  it('requires the account ID', () => {
    const result = billPaymentSchema.safeParse({ accountId: '  ', confirmation: '' })
    expect(firstError(result, 'accountId')).toBe(billPaymentMessages.accountIdEmpty)
    expect(billPaymentSchema.safeParse({ accountId: '10000000001', confirmation: '' }).success).toBe(true)
  })
})

describe('reportSchema', () => {
  it('requires a report type (RULE-VAL-069)', () => {
    const result = reportSchema.safeParse({ reportType: '', startDate: '', endDate: '', confirmation: '' })
    expect(firstError(result, 'reportType')).toBe(reportMessages.reportTypeRequired)
  })

  it('accepts monthly and yearly reports without dates', () => {
    expect(reportSchema.safeParse({ reportType: 'MONTHLY', startDate: '', endDate: '', confirmation: '' }).success).toBe(true)
    expect(reportSchema.safeParse({ reportType: 'YEARLY', confirmation: '' }).success).toBe(true)
  })

  it('requires both custom dates with component-level messages (RULE-VAL-070)', () => {
    const result = reportSchema.safeParse({ reportType: 'CUSTOM', startDate: '', endDate: '', confirmation: '' })
    expect(firstError(result, 'startDate')).toBe(reportMessages.monthEmpty('Start Date'))
    expect(firstError(result, 'endDate')).toBe(reportMessages.monthEmpty('End Date'))
  })

  it('accepts a valid custom date range without a start-before-end rule', () => {
    // Phase 1 documents no client-side start-before-end rule, so an inverted
    // range is accepted here and left to the server.
    expect(
      reportSchema.safeParse({ reportType: 'CUSTOM', startDate: '2026-09-15', endDate: '2026-09-01', confirmation: '' })
        .success,
    ).toBe(true)
  })
})

describe('validateCustomDate (RULE-VAL-070/071/072)', () => {
  it('reports missing components in the legacy order', () => {
    expect(validateCustomDate('', 'Start Date')).toBe(reportMessages.monthEmpty('Start Date'))
    expect(validateCustomDate('2026--15', 'Start Date')).toBe(reportMessages.monthEmpty('Start Date'))
    expect(validateCustomDate('2026-09', 'End Date')).toBe(reportMessages.dayEmpty('End Date'))
    expect(validateCustomDate('-09-15', 'End Date')).toBe(reportMessages.yearEmpty('End Date'))
  })

  it('applies the numeric and range edits (RULE-VAL-071)', () => {
    expect(validateCustomDate('2026-13-01', 'Start Date')).toBe(reportMessages.invalidMonth('Start Date'))
    expect(validateCustomDate('2026-AB-01', 'Start Date')).toBe(reportMessages.invalidMonth('Start Date'))
    expect(validateCustomDate('2026-09-32', 'End Date')).toBe(reportMessages.invalidDay('End Date'))
    expect(validateCustomDate('20X6-09-15', 'End Date')).toBe(reportMessages.invalidYear('End Date'))
  })

  it('requires a real calendar date (RULE-VAL-072)', () => {
    expect(validateCustomDate('2026-02-30', 'Start Date')).toBe(reportMessages.invalidDate('Start Date'))
    expect(validateCustomDate('2026-09-15', 'Start Date')).toBeNull()
  })
})
