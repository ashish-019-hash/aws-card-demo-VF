import { z } from 'zod'

/**
 * Documented transaction lookup messages (SCREEN-10 COTRN01).
 * Wording follows the legacy ERRMSG texts; trailing "..." is normalized to
 * "." as elsewhere in the app.
 */
export const transactionSearchMessages = {
  /** RULE-VAL-052 — COTRN01C.cbl:146-156, "Tran ID can NOT be empty...". */
  tranIdEmpty: 'Tran ID can NOT be empty.',
} as const

/**
 * Transaction lookup (SCREEN-10 COTRN01). A Transaction ID must be entered
 * (RULE-VAL-052); record existence (RULE-VAL-053) stays server-backed.
 */
export const transactionSearchSchema = z.object({
  transactionId: z.string().refine((value) => value.trim().length > 0, transactionSearchMessages.tranIdEmpty),
})

export type TransactionSearchFormValues = z.infer<typeof transactionSearchSchema>
