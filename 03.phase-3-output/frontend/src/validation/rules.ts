// Client-side mirrors of 01.phase-1-output/validation-rules.md (VR-001..VR-128), reusing
// the exact legacy error message text. These are pure functions: (value, ...) => string
// (error message) | undefined (valid). Composed per-field in the page components.
//
// Not every VR is duplicated client-side: a few (VR-047 NANP area-code list, VR-042
// state+zip cross-reference table) rely on large legacy lookup tables (500+ / 240+ line
// copybooks) that the backend already authoritatively validates — for those the client
// does the cheap format/range checks and defers to the backend's field-error envelope for
// the full lookup (see README "Backend gaps / validation notes").

export type FieldErrors = Record<string, string | undefined>

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === ''
}

/** VR-generic "must be supplied" check. */
export function required(value: string | null | undefined, message: string): string | undefined {
  return isBlank(value) ? message : undefined
}

export function isNumeric(value: string): boolean {
  return /^\d+$/.test(value)
}

/** VR-013/VR-054/VR-055/etc-style "must be numeric and non-zero, N digits" check. */
export function nonZeroDigits(value: string | null | undefined, length: number, message: string): string | undefined {
  if (isBlank(value)) return message
  const v = value!.trim()
  if (!isNumeric(v) || v.length !== length || Number(v) === 0) return message
  return undefined
}

/** Optional filter variant: blank is fine, but if supplied it must satisfy nonZeroDigits. */
export function optionalNonZeroDigits(
  value: string | null | undefined,
  length: number,
  message: string,
): string | undefined {
  if (isBlank(value)) return undefined
  return nonZeroDigits(value, length, message)
}

/**
 * Account ID lookups (VR-005/006/007/008/054/055/072/095): the legacy screens' BMS field
 * width fixes the account number at exactly 11 digits, but this backend assigns accounts a
 * plain auto-incrementing `Long` id (its real seed data uses ids like 2, 10, 27, 50 —
 * nowhere near 11 digits) and does not itself enforce an 11-digit format on
 * GET/PUT /api/accounts/{id}. Enforcing the legacy fixed width client-side would make every
 * real account unreachable, so this mirrors the *intent* (numeric, non-zero, up to the
 * legacy field's max width) without the exact-length requirement.
 */
export function nonZeroNumeric(value: string | null | undefined, maxLength: number, message: string): string | undefined {
  if (isBlank(value)) return message
  const v = value!.trim()
  if (!isNumeric(v) || v.length > maxLength || Number(v) === 0) return message
  return undefined
}

/** Optional variant of nonZeroNumeric: blank is fine, but if supplied it must be valid. */
export function optionalNonZeroNumeric(
  value: string | null | undefined,
  maxLength: number,
  message: string,
): string | undefined {
  if (isBlank(value)) return undefined
  return nonZeroNumeric(value, maxLength, message)
}


/** VR-011/VR-022/VR-024/etc.: alphabetic (and spaces) only, required. */
export function alphaRequired(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  return /^[A-Za-z ]+$/.test(value!) ? undefined : message
}

/** VR-012/VR-023: alphabetic (and spaces) only, optional. */
export function alphaOptional(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return undefined
  return /^[A-Za-z ]+$/.test(value!) ? undefined : message
}

/** VR-010/VR-015/VR-030c/VR-066: must be supplied and be Y or N. */
export function yesNo(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  return /^[YyNn]$/.test(value!) ? undefined : message
}

/** VR-114/VR-096: confirm value must be Y or N (blank handled separately by the caller). */
export function yesNoIfSupplied(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return undefined
  return /^[YyNn]$/.test(value!) ? undefined : message
}

/** VR-014/VR-016..020: signed numeric with up to 2 decimal places. */
export function signedAmount(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  return /^-?\d+(\.\d{1,2})?$/.test(value!.trim()) ? undefined : message
}

/**
 * VR-088: legacy fixed-width mask is sign + 8 digits + '.' + 2 digits over a BMS text
 * field; the REST API takes a JSON number instead, so this mirrors the *intent* (a
 * plain decimal amount, at most 2 decimal places, magnitude under 10^8) rather than the
 * positional string check.
 */
export function amountFormat(value: number | null | undefined, message: string): string | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) return message
  if (Math.abs(value) >= 100000000) return message
  const decimals = value.toString().split('.')[1]
  if (decimals && decimals.length > 2) return message
  return undefined
}

/** VR-089/VR-090: date must match YYYY-MM-DD positionally. */
export function dateFormat(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  return /^\d{4}-\d{2}-\d{2}$/.test(value!) ? undefined : message
}

/** VR-091/VR-092/VR-111/VR-112/VR-034: must be a real calendar date (after format passes). */
export function validCalendarDate(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value!)
  if (!m) return message
  const [, y, mo, d] = m.map(Number) as unknown as [number, number, number, number]
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return message
  return undefined
}

/** VR-035: date of birth must be strictly in the past. */
export function dateOfBirthInPast(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return date.getTime() < today.getTime() ? undefined : message
}

/** VR-067: card expiry month 1-12. */
export function expiryMonth(value: number | null | undefined, message: string): string | undefined {
  if (value === null || value === undefined) return message
  return value >= 1 && value <= 12 ? undefined : message
}

/** VR-068: card expiry year 1950-2099. */
export function expiryYear(value: number | null | undefined, message: string): string | undefined {
  if (value === null || value === undefined) return message
  return value >= 1950 && value <= 2099 ? undefined : message
}

/** VR-040: FICO score 300-850. */
export function ficoRange(value: number | null | undefined, message: string): string | undefined {
  if (value === null || value === undefined) return message
  return value >= 300 && value <= 850 ? undefined : message
}

/** VR-041: exact 2-letter US state/territory code list from CSLKPCDY.cpy:1013-1069. */
export const VALID_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'AS', 'GU', 'MP', 'PR', 'VI',
]

export function stateCode(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return undefined
  return VALID_STATE_CODES.includes(value!.toUpperCase()) ? undefined : message
}

/** VR-037: SSN first 3 digits must not be 000, 666, or in 900-999. */
export function ssnAreaValid(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value) || value!.length !== 3 || !isNumeric(value!)) return undefined
  const n = Number(value)
  return n === 0 || n === 666 || (n >= 900 && n <= 999) ? message : undefined
}

/** VR-046/VR-050/VR-053: numeric part must not be zero. */
export function nonZero(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return undefined
  return Number(value) === 0 ? message : undefined
}

/** VR-118/VR-120 etc.: user type must be A or U. */
export function userType(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  return /^[AaUu]$/.test(value!) ? undefined : message
}

/** VR-003/VR-004: menu option number must be numeric, non-zero, and within range. */
export function menuOption(value: string, max: number, message: string): string | undefined {
  if (isBlank(value) || !isNumeric(value.trim())) return message
  const n = Number(value.trim())
  return n >= 1 && n <= max ? undefined : message
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((v) => v !== undefined)
}
