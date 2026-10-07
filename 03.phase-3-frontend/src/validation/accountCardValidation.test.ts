import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import { signInSchema } from '../features/auth/signInSchema'
import { accountSearchSchema } from './accountSearch'
import { accountUpdateSchema } from './accountUpdate'
import type { AccountUpdateFormValues } from './accountUpdate'
import { cardListFilterSchema } from './cardListFilter'
import { cardSearchSchema } from './cardSearch'
import { cardUpdateSchema } from './cardUpdate'
import type { CardUpdateFormValues } from './cardUpdate'

/**
 * Step 4 schema tests for sign-on, account, and card validation. Test names
 * trace the Phase 1 rule IDs from 01.phase-1-output/validation-rules.md.
 */

function errorsOf(schema: ZodType, values: unknown): Record<string, string[]> {
  const result = schema.safeParse(values)
  if (result.success) return {}
  const byField: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    byField[key] = [...(byField[key] ?? []), issue.message]
  }
  return byField
}

describe('signInSchema (SCREEN-01 COSGN00)', () => {
  it('RULE-VAL-001 — User ID must be entered', () => {
    expect(errorsOf(signInSchema, { userId: '  ', password: 'pass1234' }).userId).toEqual([
      'Please enter User ID ...',
    ])
  })

  it('RULE-VAL-002 — Password must be entered', () => {
    expect(errorsOf(signInSchema, { userId: 'ADMIN001', password: '' }).password).toEqual([
      'Please enter Password ...',
    ])
  })

  it('accepts supplied credentials (RULE-VAL-003/004 stay server-backed)', () => {
    expect(signInSchema.safeParse({ userId: 'ADMIN001', password: 'pass1234' }).success).toBe(true)
  })
})

describe('accountSearchSchema (SCREEN-04/05 lookup)', () => {
  it('RULE-VAL-008/011 — account number must be supplied', () => {
    expect(errorsOf(accountSearchSchema, { accountId: '   ' }).accountId).toEqual([
      'Account number not provided',
    ])
  })

  it.each(['1234567890', '123456789012', '1234567890A', '00000000000'])(
    'RULE-VAL-009/012 — "%s" is not an 11-digit non-zero number',
    (accountId) => {
      expect(errorsOf(accountSearchSchema, { accountId }).accountId).toEqual([
        'Account number must be a non-zero 11-digit number.',
      ])
    },
  )

  it('accepts a valid 11-digit account number', () => {
    expect(accountSearchSchema.safeParse({ accountId: '00000000010' }).success).toBe(true)
  })
})

/** Baseline that passes every account-update edit. */
const validAccountUpdate: AccountUpdateFormValues = {
  activeStatus: 'Y',
  openDate: '2019-03-15',
  expirationDate: '2027-03-31',
  reissueDate: '2024-03-15',
  creditLimit: '7500.00',
  cashCreditLimit: '2500.00',
  currentBalance: '1284.50',
  currentCycleCredit: '450.00',
  currentCycleDebit: '-1734.50',
  groupId: 'A000000001',
  firstName: 'Sarah',
  middleName: 'J',
  lastName: 'Whitfield',
  ssn: '123456789',
  dateOfBirth: '1986-07-22',
  ficoCreditScore: '742',
  addressLine1: '1234 Maple Ave',
  addressLine2: 'Apt 4B',
  addressLine3: 'Austin',
  addressStateCode: 'TX',
  addressZip: '78701',
  addressCountryCode: 'USA',
  phoneNumber1: '5125550147',
  phoneNumber2: '',
  governmentIssuedId: 'TX-DL-48213977',
  eftAccountId: '1234567890',
  primaryCardholderIndicator: 'Y',
}

function accountErrors(overrides: Partial<AccountUpdateFormValues>) {
  return errorsOf(accountUpdateSchema, { ...validAccountUpdate, ...overrides })
}

describe('accountUpdateSchema (SCREEN-05 COACTUP)', () => {
  it('accepts the fetched baseline values', () => {
    expect(accountUpdateSchema.safeParse(validAccountUpdate).success).toBe(true)
  })

  it('RULE-VAL-014 — account status must be supplied and Y or N', () => {
    expect(accountErrors({ activeStatus: '' }).activeStatus).toEqual([
      'Account Status must be supplied.',
    ])
    expect(accountErrors({ activeStatus: 'X' }).activeStatus).toEqual([
      'Account Status must be Y or N.',
    ])
  })

  it('RULE-VAL-015 — every date must be a complete, real calendar date', () => {
    expect(accountErrors({ openDate: '' }).openDate).toEqual(['Open Date must be supplied.'])
    expect(accountErrors({ openDate: '15-03-2019' }).openDate).toEqual([
      'Open Date must be a date in YYYY-MM-DD format.',
    ])
    expect(accountErrors({ openDate: '2119-03-15' }).openDate).toEqual([
      'Open Date : Century is not valid.',
    ])
    expect(accountErrors({ expirationDate: '2027-13-01' }).expirationDate).toEqual([
      'Expiry Date: Month must be a number between 1 and 12.',
    ])
    expect(accountErrors({ reissueDate: '2024-04-31' }).reissueDate).toEqual([
      'Reissue Date:Cannot have 31 days in this month.',
    ])
    expect(accountErrors({ openDate: '2019-02-30' }).openDate).toEqual([
      'Open Date:Cannot have 30 days in this month.',
    ])
    expect(accountErrors({ openDate: '2023-02-29' }).openDate).toEqual([
      'Open Date:Not a leap year.Cannot have 29 days in this month.',
    ])
    expect(accountErrors({ openDate: '2024-02-29' }).openDate).toBeUndefined()
  })

  it('RULE-VAL-016 — date of birth cannot be in the future', () => {
    expect(accountErrors({ dateOfBirth: '2099-01-01' }).dateOfBirth).toEqual([
      'Date of Birth:cannot be in the future',
    ])
  })

  it('RULE-VAL-017 — money fields must be supplied, signed, up to 2 decimals', () => {
    expect(accountErrors({ creditLimit: '' }).creditLimit).toEqual([
      'Credit Limit must be supplied.',
    ])
    expect(accountErrors({ cashCreditLimit: 'abc' }).cashCreditLimit).toEqual([
      'Cash Credit Limit is not valid',
    ])
    expect(accountErrors({ currentBalance: '1.234' }).currentBalance).toEqual([
      'Current Balance is not valid',
    ])
    expect(accountErrors({ currentCycleCredit: '+450.5' }).currentCycleCredit).toBeUndefined()
    expect(accountErrors({ currentCycleDebit: '-1734.50' }).currentCycleDebit).toBeUndefined()
  })

  it('RULE-VAL-018 — SSN first segment must not be 000, 666, or 900-999', () => {
    for (const ssn of ['000121234', '666121234', '900121234', '999121234']) {
      expect(accountErrors({ ssn }).ssn).toEqual([
        'SSN: First 3 chars: should not be 000, 666, or between 900 and 999',
      ])
    }
  })

  it('RULE-VAL-019/020 — SSN middle and last segments must be non-zero', () => {
    expect(accountErrors({ ssn: '123004567' }).ssn).toEqual([
      'SSN 4th & 5th chars must not be zero.',
    ])
    expect(accountErrors({ ssn: '123450000' }).ssn).toEqual(['SSN Last 4 chars must not be zero.'])
    expect(accountErrors({ ssn: '12345' }).ssn).toEqual(['SSN must be a 9 digit number.'])
    expect(accountErrors({ ssn: '' }).ssn).toEqual(['SSN must be supplied.'])
  })

  it('RULE-VAL-021 — FICO score must be numeric and between 300 and 850', () => {
    expect(accountErrors({ ficoCreditScore: '29a' }).ficoCreditScore).toEqual([
      'FICO Score must be all numeric.',
    ])
    expect(accountErrors({ ficoCreditScore: '299' }).ficoCreditScore).toEqual([
      'FICO Score: should be between 300 and 850',
    ])
    expect(accountErrors({ ficoCreditScore: '851' }).ficoCreditScore).toEqual([
      'FICO Score: should be between 300 and 850',
    ])
    expect(accountErrors({ ficoCreditScore: '300' }).ficoCreditScore).toBeUndefined()
  })

  it('RULE-VAL-022 — first and last name required, alphabets only', () => {
    expect(accountErrors({ firstName: '' }).firstName).toEqual(['First Name must be supplied.'])
    expect(accountErrors({ firstName: 'Sarah2' }).firstName).toEqual([
      'First Name can have alphabets only.',
    ])
    expect(accountErrors({ lastName: "O'Brien" }).lastName).toEqual([
      'Last Name can have alphabets only.',
    ])
  })

  it('RULE-VAL-023 — middle name optional, alphabets only when entered', () => {
    expect(accountErrors({ middleName: '' }).middleName).toBeUndefined()
    expect(accountErrors({ middleName: 'J2' }).middleName).toEqual([
      'Middle Name can have alphabets only.',
    ])
  })

  it('RULE-VAL-024 — address line 1 is required', () => {
    expect(accountErrors({ addressLine1: '  ' }).addressLine1).toEqual([
      'Address Line 1 must be supplied.',
    ])
  })

  it('RULE-VAL-025 — city required and alphabetic', () => {
    expect(accountErrors({ addressLine3: '' }).addressLine3).toEqual(['City must be supplied.'])
    expect(accountErrors({ addressLine3: 'Austin78' }).addressLine3).toEqual([
      'City can have alphabets only.',
    ])
  })

  it('RULE-VAL-026 — state must be a valid US state code', () => {
    expect(accountErrors({ addressStateCode: '' }).addressStateCode).toEqual([
      'State must be supplied.',
    ])
    expect(accountErrors({ addressStateCode: '2X' }).addressStateCode).toEqual([
      'State can have alphabets only.',
    ])
    expect(accountErrors({ addressStateCode: 'ZZ' }).addressStateCode).toEqual([
      'State: is not a valid state code',
    ])
  })

  it('RULE-VAL-027 — zip required, numeric, non-zero', () => {
    expect(accountErrors({ addressZip: '' }).addressZip).toEqual(['Zip must be supplied.'])
    expect(accountErrors({ addressZip: 'abcde' }).addressZip).toEqual(['Zip must be all numeric.'])
    expect(accountErrors({ addressZip: '00000' }).addressZip).toEqual(['Zip must not be zero.'])
    expect(accountErrors({ addressZip: '787' }).addressZip).toEqual([
      'Zip must be a 5 digit number.',
    ])
  })

  it('RULE-VAL-028 — country required and alphabetic', () => {
    expect(accountErrors({ addressCountryCode: '' }).addressCountryCode).toEqual([
      'Country must be supplied.',
    ])
    expect(accountErrors({ addressCountryCode: 'US1' }).addressCountryCode).toEqual([
      'Country can have alphabets only.',
    ])
  })

  it('RULE-VAL-029 — zip first two digits must be valid for the state', () => {
    const errors = accountErrors({ addressStateCode: 'CA', addressZip: '78701' })
    expect(errors.addressStateCode).toEqual(['Invalid zip code for state'])
    expect(errors.addressZip).toEqual(['Invalid zip code for state'])
  })

  it('RULE-VAL-029 — combo check runs only when state and zip are individually valid', () => {
    const errors = accountErrors({ addressStateCode: 'ZZ', addressZip: '78701' })
    expect(errors.addressStateCode).toEqual(['State: is not a valid state code'])
    expect(errors.addressZip).toBeUndefined()
  })

  it('RULE-VAL-030 — phones optional; entered numbers run the part edits', () => {
    expect(accountErrors({ phoneNumber1: '' }).phoneNumber1).toBeUndefined()
    expect(accountErrors({ phoneNumber1: '51a' }).phoneNumber1).toEqual([
      'Phone Number 1: Area code must be A 3 digit number.',
    ])
    expect(accountErrors({ phoneNumber1: '0005550147' }).phoneNumber1).toEqual([
      'Phone Number 1: Area code cannot be zero',
    ])
    expect(accountErrors({ phoneNumber1: '1235550147' }).phoneNumber1).toEqual([
      'Phone Number 1: Not valid North America general purpose area code',
    ])
    expect(accountErrors({ phoneNumber2: '5120000147' }).phoneNumber2).toEqual([
      'Phone Number 2: Prefix code cannot be zero',
    ])
    expect(accountErrors({ phoneNumber2: '51255501' }).phoneNumber2).toEqual([
      'Phone Number 2: Line number code must be A 4 digit number.',
    ])
    expect(accountErrors({ phoneNumber2: '5125550000' }).phoneNumber2).toEqual([
      'Phone Number 2: Line number code cannot be zero',
    ])
  })

  it('RULE-VAL-031 — EFT account ID required, numeric, non-zero, 10 digits', () => {
    expect(accountErrors({ eftAccountId: '' }).eftAccountId).toEqual([
      'EFT Account Id must be supplied.',
    ])
    expect(accountErrors({ eftAccountId: '12345abc90' }).eftAccountId).toEqual([
      'EFT Account Id must be all numeric.',
    ])
    expect(accountErrors({ eftAccountId: '0000000000' }).eftAccountId).toEqual([
      'EFT Account Id must not be zero.',
    ])
    expect(accountErrors({ eftAccountId: '12345' }).eftAccountId).toEqual([
      'EFT Account Id must be a 10 digit number.',
    ])
  })

  it('RULE-VAL-032 — primary card holder must be Y or N', () => {
    expect(accountErrors({ primaryCardholderIndicator: '' }).primaryCardholderIndicator).toEqual([
      'Primary Card Holder must be supplied.',
    ])
    expect(accountErrors({ primaryCardholderIndicator: 'X' }).primaryCardholderIndicator).toEqual([
      'Primary Card Holder must be Y or N.',
    ])
  })
})

describe('cardListFilterSchema (SCREEN-06 COCRDLI)', () => {
  it('RULE-VAL-035 — blank or zero account filter means "no filter"', () => {
    expect(cardListFilterSchema.safeParse({ accountId: '', cardNumber: '' }).success).toBe(true)
    expect(
      cardListFilterSchema.safeParse({ accountId: '00000000000', cardNumber: '' }).success,
    ).toBe(true)
  })

  it('RULE-VAL-035 — a supplied account filter must be an 11-digit number', () => {
    expect(errorsOf(cardListFilterSchema, { accountId: '123', cardNumber: '' }).accountId).toEqual([
      'Account number must be an 11-digit number.',
    ])
  })

  it('RULE-VAL-036 — a supplied card filter must be a 16-digit number', () => {
    expect(
      errorsOf(cardListFilterSchema, { accountId: '', cardNumber: '4000-1234' }).cardNumber,
    ).toEqual(['Card number must be a 16-digit number.'])
    expect(
      cardListFilterSchema.safeParse({ accountId: '', cardNumber: '4000123456789012' }).success,
    ).toBe(true)
  })
})

describe('cardSearchSchema (SCREEN-07/08 lookup)', () => {
  it('RULE-VAL-039/042 — account number supplied (blank or zero prompts)', () => {
    expect(
      errorsOf(cardSearchSchema, { accountId: '', cardNumber: '4000123456789012' }).accountId,
    ).toEqual(['Account number not provided'])
    expect(
      errorsOf(cardSearchSchema, { accountId: '00000000000', cardNumber: '4000123456789012' })
        .accountId,
    ).toEqual(['Account number not provided'])
  })

  it('RULE-VAL-040/043 — card number supplied (blank or zero prompts)', () => {
    expect(
      errorsOf(cardSearchSchema, { accountId: '00000000010', cardNumber: '  ' }).cardNumber,
    ).toEqual(['Card number not provided'])
  })

  it('RULE-VAL-039/040 — supplied keys must be 11- and 16-digit numbers', () => {
    const errors = errorsOf(cardSearchSchema, { accountId: '123', cardNumber: '4000' })
    expect(errors.accountId).toEqual(['Account number must be a non-zero 11-digit number.'])
    expect(errors.cardNumber).toEqual(['Card number must be a 16-digit number.'])
    expect(
      cardSearchSchema.safeParse({ accountId: '00000000010', cardNumber: '4000123456789012' })
        .success,
    ).toBe(true)
  })
})

/** Baseline that passes every card-update edit. */
const validCardUpdate: CardUpdateFormValues = {
  embossedName: 'SARAH WHITFIELD',
  activeStatus: 'Y',
  expiryMonth: '3',
  expiryYear: '2027',
}

function cardErrors(overrides: Partial<CardUpdateFormValues>) {
  return errorsOf(cardUpdateSchema, { ...validCardUpdate, ...overrides })
}

describe('cardUpdateSchema (SCREEN-08 COCRDUP)', () => {
  it('accepts the fetched baseline values', () => {
    expect(cardUpdateSchema.safeParse(validCardUpdate).success).toBe(true)
  })

  it('RULE-VAL-045 — embossed name required, alphabets and spaces only', () => {
    expect(cardErrors({ embossedName: '  ' }).embossedName).toEqual(['Card name not provided'])
    expect(cardErrors({ embossedName: 'SARAH W 3RD' }).embossedName).toEqual([
      'Card name can only contain alphabets and spaces',
    ])
  })

  it('RULE-VAL-046 — card active status must be Y or N', () => {
    expect(cardErrors({ activeStatus: '' }).activeStatus).toEqual([
      'Card Active Status must be Y or N',
    ])
    expect(cardErrors({ activeStatus: 'X' }).activeStatus).toEqual([
      'Card Active Status must be Y or N',
    ])
  })

  it('RULE-VAL-047 — expiry month must be between 1 and 12', () => {
    for (const expiryMonth of ['', '0', '13', '1a']) {
      expect(cardErrors({ expiryMonth }).expiryMonth).toEqual([
        'Card expiry month must be between 1 and 12',
      ])
    }
    expect(cardErrors({ expiryMonth: '12' }).expiryMonth).toBeUndefined()
  })

  it('RULE-VAL-048 — expiry year must be between 1950 and 2099', () => {
    for (const expiryYear of ['', '1949', '2100', '27']) {
      expect(cardErrors({ expiryYear }).expiryYear).toEqual(['Invalid card expiry year'])
    }
    expect(cardErrors({ expiryYear: '1950' }).expiryYear).toBeUndefined()
    expect(cardErrors({ expiryYear: '2099' }).expiryYear).toBeUndefined()
  })
})
