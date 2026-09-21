import { describe, expect, it } from 'vitest'
import {
  alphaOptional,
  alphaRequired,
  amountFormat,
  dateFormat,
  dateOfBirthInPast,
  expiryMonth,
  expiryYear,
  ficoRange,
  hasErrors,
  isBlank,
  isNumeric,
  menuOption,
  nonZero,
  nonZeroDigits,
  optionalNonZeroDigits,
  required,
  signedAmount,
  ssnAreaValid,
  stateCode,
  userType,
  validCalendarDate,
  yesNo,
  yesNoIfSupplied,
} from './rules'

describe('isBlank / required', () => {
  it('treats null, undefined, and whitespace-only as blank', () => {
    expect(isBlank(null)).toBe(true)
    expect(isBlank(undefined)).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('x')).toBe(false)
  })

  it('required returns the message only when blank', () => {
    expect(required('', 'msg')).toBe('msg')
    expect(required('value', 'msg')).toBeUndefined()
  })
})

describe('isNumeric', () => {
  it('accepts digits only', () => {
    expect(isNumeric('12345')).toBe(true)
    expect(isNumeric('12a45')).toBe(false)
    expect(isNumeric('')).toBe(false)
  })
})

describe('nonZeroDigits (VR-005/006/054/055 style)', () => {
  it('rejects blank, wrong length, non-numeric, and all-zero', () => {
    expect(nonZeroDigits('', 11, 'msg')).toBe('msg')
    expect(nonZeroDigits('123', 11, 'msg')).toBe('msg')
    expect(nonZeroDigits('1234567890a', 11, 'msg')).toBe('msg')
    expect(nonZeroDigits('00000000000', 11, 'msg')).toBe('msg')
  })

  it('accepts a valid non-zero N-digit number', () => {
    expect(nonZeroDigits('12345678901', 11, 'msg')).toBeUndefined()
  })

  it('optionalNonZeroDigits allows blank but still validates when supplied', () => {
    expect(optionalNonZeroDigits('', 11, 'msg')).toBeUndefined()
    expect(optionalNonZeroDigits('123', 11, 'msg')).toBe('msg')
    expect(optionalNonZeroDigits('12345678901', 11, 'msg')).toBeUndefined()
  })
})

describe('alphaRequired / alphaOptional', () => {
  it('accepts letters and spaces only', () => {
    expect(alphaRequired('John Doe', 'msg')).toBeUndefined()
    expect(alphaRequired('John3', 'msg')).toBe('msg')
    expect(alphaRequired('', 'msg')).toBe('msg')
    expect(alphaOptional('', 'msg')).toBeUndefined()
    expect(alphaOptional('John3', 'msg')).toBe('msg')
  })
})

describe('yesNo / yesNoIfSupplied', () => {
  it('yesNo requires Y or N (case-insensitive)', () => {
    expect(yesNo('Y', 'msg')).toBeUndefined()
    expect(yesNo('n', 'msg')).toBeUndefined()
    expect(yesNo('', 'msg')).toBe('msg')
    expect(yesNo('X', 'msg')).toBe('msg')
  })

  it('yesNoIfSupplied allows blank', () => {
    expect(yesNoIfSupplied('', 'msg')).toBeUndefined()
    expect(yesNoIfSupplied('X', 'msg')).toBe('msg')
  })
})

describe('signedAmount', () => {
  it('accepts signed decimals with up to 2 decimal places', () => {
    expect(signedAmount('-123.45', 'msg')).toBeUndefined()
    expect(signedAmount('123', 'msg')).toBeUndefined()
    expect(signedAmount('123.456', 'msg')).toBe('msg')
    expect(signedAmount('abc', 'msg')).toBe('msg')
    expect(signedAmount('', 'msg')).toBe('msg')
  })
})

describe('amountFormat (VR-088)', () => {
  it('rejects non-numbers, oversized magnitude, and >2 decimals', () => {
    expect(amountFormat(null, 'msg')).toBe('msg')
    expect(amountFormat(100000000, 'msg')).toBe('msg')
    expect(amountFormat(1.234, 'msg')).toBe('msg')
    expect(amountFormat(-99999999.99, 'msg')).toBeUndefined()
    expect(amountFormat(0, 'msg')).toBeUndefined()
  })
})

describe('dateFormat / validCalendarDate (VR-089/090/091/092)', () => {
  it('dateFormat enforces YYYY-MM-DD shape', () => {
    expect(dateFormat('2024-01-31', 'msg')).toBeUndefined()
    expect(dateFormat('2024/01/31', 'msg')).toBe('msg')
    expect(dateFormat('', 'msg')).toBe('msg')
  })

  it('validCalendarDate rejects impossible calendar dates', () => {
    expect(validCalendarDate('2024-02-29', 'msg')).toBeUndefined() // leap year
    expect(validCalendarDate('2023-02-29', 'msg')).toBe('msg') // not a leap year
    expect(validCalendarDate('2024-13-01', 'msg')).toBe('msg')
    expect(validCalendarDate('2024-04-31', 'msg')).toBe('msg')
  })
})

describe('dateOfBirthInPast (VR-035)', () => {
  it('accepts blank (optional) and past dates, rejects today/future', () => {
    expect(dateOfBirthInPast('', 'msg')).toBeUndefined()
    expect(dateOfBirthInPast('1990-01-01', 'msg')).toBeUndefined()
    const future = new Date()
    future.setUTCFullYear(future.getUTCFullYear() + 1)
    const isoFuture = future.toISOString().slice(0, 10)
    expect(dateOfBirthInPast(isoFuture, 'msg')).toBe('msg')
  })
})

describe('expiryMonth / expiryYear (VR-067/068)', () => {
  it('boundaries: month 1 and 12 valid, 0 and 13 invalid', () => {
    expect(expiryMonth(1, 'msg')).toBeUndefined()
    expect(expiryMonth(12, 'msg')).toBeUndefined()
    expect(expiryMonth(0, 'msg')).toBe('msg')
    expect(expiryMonth(13, 'msg')).toBe('msg')
    expect(expiryMonth(null, 'msg')).toBe('msg')
  })

  it('boundaries: year 1950 and 2099 valid, 1949 and 2100 invalid', () => {
    expect(expiryYear(1950, 'msg')).toBeUndefined()
    expect(expiryYear(2099, 'msg')).toBeUndefined()
    expect(expiryYear(1949, 'msg')).toBe('msg')
    expect(expiryYear(2100, 'msg')).toBe('msg')
  })
})

describe('ficoRange (VR-040)', () => {
  it('boundaries: 300 and 850 valid, 299 and 851 invalid', () => {
    expect(ficoRange(300, 'msg')).toBeUndefined()
    expect(ficoRange(850, 'msg')).toBeUndefined()
    expect(ficoRange(299, 'msg')).toBe('msg')
    expect(ficoRange(851, 'msg')).toBe('msg')
  })
})

describe('stateCode (VR-041)', () => {
  it('accepts blank and valid codes (including territories), rejects unknown', () => {
    expect(stateCode('', 'msg')).toBeUndefined()
    expect(stateCode('CA', 'msg')).toBeUndefined()
    expect(stateCode('pr', 'msg')).toBeUndefined()
    expect(stateCode('ZZ', 'msg')).toBe('msg')
  })
})

describe('ssnAreaValid (VR-037)', () => {
  it('rejects 000, 666, and 900-999; accepts everything else', () => {
    expect(ssnAreaValid('000', 'msg')).toBe('msg')
    expect(ssnAreaValid('666', 'msg')).toBe('msg')
    expect(ssnAreaValid('900', 'msg')).toBe('msg')
    expect(ssnAreaValid('999', 'msg')).toBe('msg')
    expect(ssnAreaValid('123', 'msg')).toBeUndefined()
    expect(ssnAreaValid('899', 'msg')).toBeUndefined()
  })
})

describe('nonZero (VR-046/050/053)', () => {
  it('allows blank, rejects zero, accepts non-zero', () => {
    expect(nonZero('', 'msg')).toBeUndefined()
    expect(nonZero('0', 'msg')).toBe('msg')
    expect(nonZero('5', 'msg')).toBeUndefined()
  })
})

describe('userType (VR-118/120)', () => {
  it('requires A or U (case-insensitive)', () => {
    expect(userType('A', 'msg')).toBeUndefined()
    expect(userType('u', 'msg')).toBeUndefined()
    expect(userType('', 'msg')).toBe('msg')
    expect(userType('X', 'msg')).toBe('msg')
  })
})

describe('menuOption (VR-003/004)', () => {
  it('requires numeric value within [1, max]', () => {
    expect(menuOption('1', 5, 'msg')).toBeUndefined()
    expect(menuOption('5', 5, 'msg')).toBeUndefined()
    expect(menuOption('0', 5, 'msg')).toBe('msg')
    expect(menuOption('6', 5, 'msg')).toBe('msg')
    expect(menuOption('abc', 5, 'msg')).toBe('msg')
  })
})

describe('hasErrors', () => {
  it('detects any defined error message in a FieldErrors map', () => {
    expect(hasErrors({})).toBe(false)
    expect(hasErrors({ a: undefined })).toBe(false)
    expect(hasErrors({ a: undefined, b: 'oops' })).toBe(true)
  })
})
