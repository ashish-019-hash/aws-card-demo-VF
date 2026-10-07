import { z } from 'zod'

/**
 * Documented transaction-list filter messages (SCREEN-09 COTRN00).
 * Wording follows the legacy ERRMSG texts; trailing "..." is normalized to
 * "." as elsewhere in the app.
 */
export const transactionListFilterMessages = {
  /** RULE-VAL-051 — COTRN00C.cbl:206-220, "Tran ID must be Numeric ...". */
  tranIdNotNumeric: 'Tran ID must be Numeric.',
} as const

/**
 * Transaction list filter (SCREEN-09 COTRN00). The transaction-ID filter is
 * optional — blank lists from the beginning — but a non-blank value must be
 * numeric (RULE-VAL-051).
 */
export const transactionListFilterSchema = z.object({
  transactionId: z
    .string()
    .optional()
    .refine(
      (value) => !value?.trim() || /^\d+$/.test(value.trim()),
      transactionListFilterMessages.tranIdNotNumeric,
    ),
})

export type TransactionListFilterFormValues = z.infer<typeof transactionListFilterSchema>
