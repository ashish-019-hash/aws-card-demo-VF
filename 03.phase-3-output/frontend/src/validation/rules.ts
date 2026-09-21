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

/**
 * VR-013/VR-054/VR-055/VR-006/VR-095-style "must be numeric and non-zero, exactly N
 * digits" check. Also the account-id validator: the legacy screens' BMS field width fixes
 * account numbers at exactly 11 digits, and the real backend accepts zero-padded numeric
 * ids identically to their bare-number form (e.g. `00000000010` and `10` both resolve to
 * account 10), so the legacy exact-length rule is enforced client-side and the (already
 * zero-padded) string the user typed is sent through unchanged — see README "Backend
 * deviations".
 */
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

/**
 * VR-010/VR-015/VR-030c/VR-066: must be supplied and be Y or N. The legacy screens show a
 * distinct message for "blank" vs. "supplied but not Y/N" (e.g. VR-010's
 * "Account Status must be supplied." vs "Account Status must be Y or N."); `invalidMessage`
 * defaults to `blankMessage` for call sites that only have one legacy message text.
 */
export function yesNo(
  value: string | null | undefined,
  blankMessage: string,
  invalidMessage: string = blankMessage,
): string | undefined {
  if (isBlank(value)) return blankMessage
  return /^[YyNn]$/.test(value!) ? undefined : invalidMessage
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

/** VR-118/VR-120 etc.: user type must be A or U. */
export function userType(value: string | null | undefined, message: string): string | undefined {
  if (isBlank(value)) return message
  return /^[AaUu]$/.test(value!) ? undefined : message
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((v) => v !== undefined)
}

/**
 * Accessibility helper (review Finding 10): after a failed validate/submit, move focus to
 * the first invalid field (in on-screen order) so screen-reader/keyboard users land on the
 * error instead of having to hunt for it. `order` should list field ids in the same order
 * they appear on the form; the first one present in `errors` with a message wins.
 */
export function focusFirstInvalidField(errors: FieldErrors, order: readonly string[]): void {
  for (const field of order) {
    if (!errors[field]) continue
    const el = document.getElementById(field)
    if (el) {
      el.focus()
      return
    }
  }
}

/**
 * Field-by-field equality check for "no change detected" comparisons (BR-009/BR-015 style
 * confirm gates on the Card/Account update screens). Deliberately does NOT rely on
 * `JSON.stringify`, which is key-order sensitive and can report two objects with identical
 * values as "changed" if their keys were built in different order (see unit-test DEFECTS.md
 * #1 for the CardUpdatePage bug this replaces).
 */
export function fieldsEqual<T extends object>(a: T, b: T): boolean {
  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  const keys = new Set([...Object.keys(aRecord), ...Object.keys(bRecord)])
  for (const key of keys) {
    if (aRecord[key] !== bRecord[key]) return false
  }
  return true
}
