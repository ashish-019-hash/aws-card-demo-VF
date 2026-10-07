import { z } from 'zod'
import { NANP_AREA_CODES, US_STATE_CODES, US_STATE_ZIP_PREFIXES } from './lookups'

/**
 * Legacy field-edit helpers shared by the sign-on, account, and card schemas
 * (Step 4). Each helper mirrors a generic edit paragraph of COACTUPC.cbl
 * (1215-EDIT-MANDATORY, 1220-EDIT-YESNO, 1225-EDIT-ALPHA-REQD,
 * 1235-EDIT-ALPHA-OPT, 1245-EDIT-NUM-REQD, 1250-EDIT-SIGNED-9V2,
 * 1260-EDIT-US-PHONE-NUM, 1265-EDIT-US-SSN, 1270-EDIT-US-STATE-CD,
 * 1275-EDIT-FICO-SCORE, 1280-EDIT-US-STATE-ZIP-CD) or the date-edit copybook
 * CSUTLDPY.cpy, and keeps the legacy message text. A helper returns the error
 * message for the first failing edit, or null when the value passes.
 */

export type FieldEdit = (value: string | undefined) => string | null

const ALPHA_AND_SPACES = /^[A-Za-z ]+$/

function isBlank(value: string | undefined): value is undefined | '' {
  return value === undefined || value.trim() === ''
}

function isAllZeros(value: string): boolean {
  return /^0+$/.test(value)
}

/** Wraps a field edit as a zod string schema that reports the edit's message. */
export function editedString(edit: FieldEdit) {
  return z.string().superRefine((value, ctx) => {
    const message = edit(value)
    if (message) {
      ctx.addIssue({ code: 'custom', message })
    }
  })
}

/** Optional variant: undefined is passed through to the edit unchanged. */
export function editedOptionalString(edit: FieldEdit) {
  return z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      const message = edit(value)
      if (message) {
        ctx.addIssue({ code: 'custom', message })
      }
    })
}

/** COACTUPC 1215-EDIT-MANDATORY — "<name> must be supplied.". */
export function mandatoryEdit(name: string): FieldEdit {
  return (value) => (isBlank(value) ? `${name} must be supplied.` : null)
}

/** COACTUPC 1220-EDIT-YESNO — supplied and Y or N. */
export function yesNoEdit(name: string): FieldEdit {
  return (value) => {
    if (isBlank(value)) return `${name} must be supplied.`
    if (value.trim() !== 'Y' && value.trim() !== 'N') return `${name} must be Y or N.`
    return null
  }
}

/** COACTUPC 1225-EDIT-ALPHA-REQD — supplied, alphabets and spaces only. */
export function alphaRequiredEdit(name: string): FieldEdit {
  return (value) => {
    if (isBlank(value)) return `${name} must be supplied.`
    if (!ALPHA_AND_SPACES.test(value)) return `${name} can have alphabets only.`
    return null
  }
}

/** COACTUPC 1235-EDIT-ALPHA-OPT — blank accepted; otherwise alphabets/spaces only. */
export function alphaOptionalEdit(name: string): FieldEdit {
  return (value) => {
    if (isBlank(value)) return null
    if (!ALPHA_AND_SPACES.test(value)) return `${name} can have alphabets only.`
    return null
  }
}

/** COACTUPC 1245-EDIT-NUM-REQD — supplied, all numeric, non-zero, fixed length. */
export function numericRequiredEdit(name: string, length: number): FieldEdit {
  return (value) => {
    if (isBlank(value)) return `${name} must be supplied.`
    const v = value.trim()
    if (!/^\d+$/.test(v)) return `${name} must be all numeric.`
    if (isAllZeros(v)) return `${name} must not be zero.`
    if (v.length !== length) return `${name} must be a ${length} digit number.`
    return null
  }
}

/** COACTUPC 1250-EDIT-SIGNED-9V2 — supplied and a valid signed amount, up to 2 decimals. */
export function signedMoneyEdit(name: string): FieldEdit {
  return (value) => {
    if (isBlank(value)) return `${name} must be supplied.`
    if (!/^[+-]?(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(value.trim())) return `${name} is not valid`
    return null
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/**
 * CSUTLDPY.cpy EDIT-DATE-CCYYMMDD applied to the single YYYY-MM-DD input
 * (approved decision 2): century 19/20, month 1-12, day 1-31, day valid for
 * the month, Feb 29 only in leap years (RULE-VAL-015).
 */
export function dateEdit(name: string): FieldEdit {
  return (value) => {
    if (isBlank(value)) return `${name} must be supplied.`
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (!match) return `${name} must be a date in YYYY-MM-DD format.`
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const century = Math.floor(year / 100)
    if (century !== 19 && century !== 20) return `${name} : Century is not valid.`
    if (month < 1 || month > 12) return `${name}: Month must be a number between 1 and 12.`
    if (day < 1 || day > 31) return `${name}:day must be a number between 1 and 31.`
    if (day === 31 && [2, 4, 6, 9, 11].includes(month)) {
      return `${name}:Cannot have 31 days in this month.`
    }
    if (month === 2 && day === 30) return `${name}:Cannot have 30 days in this month.`
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      return `${name}:Not a leap year.Cannot have 29 days in this month.`
    }
    return null
  }
}

/**
 * CSUTLDPY.cpy EDIT-DATE-OF-BIRTH — full date edit, then the date must be in
 * the past (today itself is rejected, like the legacy "current > entered"
 * check) (RULE-VAL-015/016).
 */
export function dateOfBirthEdit(name: string): FieldEdit {
  const edit = dateEdit(name)
  return (value) => {
    const message = edit(value)
    if (message) return message
    const today = new Date()
    const todayIso = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    if ((value as string).trim() >= todayIso) return `${name}:cannot be in the future`
    return null
  }
}

/**
 * COACTUPC 1265-EDIT-US-SSN applied to the single 9-digit input (approved
 * decision 2): part 1 not 000/666/900-999, parts 2 and 3 non-zero
 * (RULE-VAL-018/019/020).
 */
export function ssnEdit(): FieldEdit {
  return (value) => {
    if (isBlank(value)) return 'SSN must be supplied.'
    const v = value.trim()
    if (!/^\d{9}$/.test(v)) return 'SSN must be a 9 digit number.'
    const part1 = Number(v.slice(0, 3))
    if (part1 === 0 || part1 === 666 || part1 >= 900) {
      return 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999'
    }
    if (v.slice(3, 5) === '00') return 'SSN 4th & 5th chars must not be zero.'
    if (v.slice(5) === '0000') return 'SSN Last 4 chars must not be zero.'
    return null
  }
}

/** COACTUPC 1275-EDIT-FICO-SCORE — numeric and between 300 and 850 (RULE-VAL-021). */
export function ficoScoreEdit(): FieldEdit {
  return (value) => {
    if (isBlank(value)) return 'FICO Score must be supplied.'
    const v = value.trim()
    if (!/^\d+$/.test(v)) return 'FICO Score must be all numeric.'
    const score = Number(v)
    if (score < 300 || score > 850) return 'FICO Score: should be between 300 and 850'
    return null
  }
}

/** COACTUPC 1270-EDIT-US-STATE-CD — required, alphabetic, in the state list (RULE-VAL-026). */
export function stateCodeEdit(): FieldEdit {
  return (value) => {
    if (isBlank(value)) return 'State must be supplied.'
    const v = value.trim()
    if (!ALPHA_AND_SPACES.test(v)) return 'State can have alphabets only.'
    if (!US_STATE_CODES.has(v.toUpperCase())) return 'State: is not a valid state code'
    return null
  }
}

/** COACTUPC zip edit via 1245-EDIT-NUM-REQD — supplied, numeric, non-zero, 5 digits (RULE-VAL-027). */
export function zipCodeEdit(): FieldEdit {
  return (value) => {
    if (isBlank(value)) return 'Zip must be supplied.'
    const v = value.trim()
    if (!/^\d+$/.test(v)) return 'Zip must be all numeric.'
    if (isAllZeros(v)) return 'Zip must not be zero.'
    if (v.length !== 5) return 'Zip must be a 5 digit number.'
    return null
  }
}

/**
 * COACTUPC 1280-EDIT-US-STATE-ZIP-CD — cross-field: state + first two zip
 * digits must be a valid USPS combination. Runs only when both fields passed
 * their own edits, like the legacy trigger (RULE-VAL-029).
 */
export function stateZipComboMessage(state: string, zip: string): string | null {
  if (stateCodeEdit()(state) || zipCodeEdit()(zip)) return null
  if (!US_STATE_ZIP_PREFIXES.has(state.trim().toUpperCase() + zip.trim().slice(0, 2))) {
    return 'Invalid zip code for state'
  }
  return null
}

/**
 * COACTUPC 1260-EDIT-US-PHONE-NUM applied to the single 10-digit input
 * (approved decision 2): optional as a whole; otherwise area code (NANP
 * lookup), prefix, and line number are each edited in legacy order
 * (RULE-VAL-030).
 */
export function phoneEdit(name: string): FieldEdit {
  return (value) => {
    if (isBlank(value)) return null
    const v = value.trim()
    const area = v.slice(0, 3)
    const prefix = v.slice(3, 6)
    const line = v.slice(6)
    if (!/^\d{3}$/.test(area)) return `${name}: Area code must be A 3 digit number.`
    if (area === '000') return `${name}: Area code cannot be zero`
    if (!NANP_AREA_CODES.has(area)) {
      return `${name}: Not valid North America general purpose area code`
    }
    if (!/^\d{3}$/.test(prefix)) return `${name}: Prefix code must be A 3 digit number.`
    if (prefix === '000') return `${name}: Prefix code cannot be zero`
    if (!/^\d{4}$/.test(line)) return `${name}: Line number code must be A 4 digit number.`
    if (line === '0000') return `${name}: Line number code cannot be zero`
    return null
  }
}
