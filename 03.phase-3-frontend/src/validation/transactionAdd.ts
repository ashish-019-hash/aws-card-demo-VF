import { z } from 'zod'

/**
 * Documented transaction-add messages (SCREEN-11 COTRN02). Wording follows
 * the legacy ERRMSG texts in COTRN02C.cbl `VALIDATE-INPUT-KEY-FIELDS` /
 * `VALIDATE-INPUT-DATA-FIELDS`; trailing "..." is normalized to "." as
 * elsewhere in the app.
 */
export const transactionAddMessages = {
  /** RULE-VAL-054 — COTRN02C.cbl:224-229. */
  accountOrCardRequired: 'Account or Card Number must be entered.',
  /** RULE-VAL-055 — COTRN02C.cbl:196-203. */
  accountIdNotNumeric: 'Account ID must be Numeric.',
  /** RULE-VAL-055 — COTRN02C.cbl:210-217. */
  cardNumberNotNumeric: 'Card Number must be Numeric.',
  /** RULE-VAL-057 — COTRN02C.cbl:251-320, one "... can NOT be empty..." per field. */
  typeCodeEmpty: 'Type CD can NOT be empty.',
  categoryCodeEmpty: 'Category CD can NOT be empty.',
  sourceEmpty: 'Source can NOT be empty.',
  descriptionEmpty: 'Description can NOT be empty.',
  amountEmpty: 'Amount can NOT be empty.',
  origDateEmpty: 'Orig Date can NOT be empty.',
  procDateEmpty: 'Proc Date can NOT be empty.',
  merchantIdEmpty: 'Merchant ID can NOT be empty.',
  merchantNameEmpty: 'Merchant Name can NOT be empty.',
  merchantCityEmpty: 'Merchant City can NOT be empty.',
  merchantZipEmpty: 'Merchant Zip can NOT be empty.',
  /** RULE-VAL-058 — COTRN02C.cbl:322-337. */
  typeCodeNotNumeric: 'Type CD must be Numeric.',
  categoryCodeNotNumeric: 'Category CD must be Numeric.',
  /** RULE-VAL-059 — COTRN02C.cbl:339-351, exact signed form. */
  amountFormat: 'Amount should be in format -99999999.99',
  /** RULE-VAL-060 — COTRN02C.cbl:353-366 / 368-381 (format). */
  origDateFormat: 'Orig Date should be in format YYYY-MM-DD',
  procDateFormat: 'Proc Date should be in format YYYY-MM-DD',
  /** RULE-VAL-060 — COTRN02C.cbl:389-427 (CSUTLDTC calendar check). */
  origDateNotValid: 'Orig Date - Not a valid date.',
  procDateNotValid: 'Proc Date - Not a valid date.',
  /** RULE-VAL-061 — COTRN02C.cbl:430-436. */
  merchantIdNotNumeric: 'Merchant ID must be Numeric.',
} as const

const DIGITS = /^\d+$/

/** RULE-VAL-059 — sign, 8 digits, decimal point, 2 digits (-99999999.99). */
export const SIGNED_AMOUNT_PATTERN = /^[+-]\d{8}\.\d{2}$/

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** True when a YYYY-MM-DD string is a real calendar date (RULE-VAL-060/072). */
export function isRealIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

type Check = (value: string) => string | null

const required = (message: string): Check => (value) => (value.trim() ? null : message)
const numeric = (message: string): Check => (value) => (DIGITS.test(value.trim()) ? null : message)
const optionalNumeric = (message: string): Check => (value) =>
  !value.trim() || DIGITS.test(value.trim()) ? null : message

/**
 * Runs the checks in the legacy order and reports only the first failure,
 * mirroring the one-message-at-a-time ERRMSG behavior.
 */
function legacyField(...checks: Check[]) {
  return z.string().superRefine((value, ctx) => {
    for (const check of checks) {
      const message = check(value)
      if (message) {
        ctx.addIssue({ code: 'custom', message })
        return
      }
    }
  })
}

/**
 * Transaction add (SCREEN-11 COTRN02). Field names follow the backend
 * TransactionRequest DTO. Client-applicable rules RULE-VAL-054/055/057-061;
 * cross-reference existence (RULE-VAL-056) and ID uniqueness (RULE-VAL-063)
 * stay server-backed, and the confirmation (RULE-VAL-062) is supplied by the
 * ConfirmPanel so invalid typed values are unreachable.
 */
export const transactionAddSchema = z
  .object({
    accountId: legacyField(optionalNumeric(transactionAddMessages.accountIdNotNumeric)).optional(),
    cardNumber: legacyField(optionalNumeric(transactionAddMessages.cardNumberNotNumeric)).optional(),
    transactionTypeCode: legacyField(
      required(transactionAddMessages.typeCodeEmpty),
      numeric(transactionAddMessages.typeCodeNotNumeric),
    ),
    transactionCategoryCode: legacyField(
      required(transactionAddMessages.categoryCodeEmpty),
      numeric(transactionAddMessages.categoryCodeNotNumeric),
    ),
    source: legacyField(required(transactionAddMessages.sourceEmpty)),
    description: legacyField(required(transactionAddMessages.descriptionEmpty)),
    amount: legacyField(required(transactionAddMessages.amountEmpty), (value) =>
      SIGNED_AMOUNT_PATTERN.test(value.trim()) ? null : transactionAddMessages.amountFormat,
    ),
    originationTimestamp: legacyField(
      required(transactionAddMessages.origDateEmpty),
      (value) => (ISO_DATE_PATTERN.test(value.trim()) ? null : transactionAddMessages.origDateFormat),
      (value) => (isRealIsoDate(value.trim()) ? null : transactionAddMessages.origDateNotValid),
    ),
    processingTimestamp: legacyField(
      required(transactionAddMessages.procDateEmpty),
      (value) => (ISO_DATE_PATTERN.test(value.trim()) ? null : transactionAddMessages.procDateFormat),
      (value) => (isRealIsoDate(value.trim()) ? null : transactionAddMessages.procDateNotValid),
    ),
    merchantId: legacyField(
      required(transactionAddMessages.merchantIdEmpty),
      numeric(transactionAddMessages.merchantIdNotNumeric),
    ),
    merchantName: legacyField(required(transactionAddMessages.merchantNameEmpty)),
    merchantCity: legacyField(required(transactionAddMessages.merchantCityEmpty)),
    merchantZip: legacyField(required(transactionAddMessages.merchantZipEmpty)),
    // 'Y' / 'N' set by the ConfirmPanel, mirroring the legacy CONFIRM field.
    confirmation: z.string().optional(),
  })
  // RULE-VAL-054 — at least one of the two keys; reported on the account
  // field, where the legacy screen put the cursor.
  .superRefine((values, ctx) => {
    if (!values.accountId?.trim() && !values.cardNumber?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['accountId'], message: transactionAddMessages.accountOrCardRequired })
    }
  })

export type TransactionAddFormValues = z.infer<typeof transactionAddSchema>
