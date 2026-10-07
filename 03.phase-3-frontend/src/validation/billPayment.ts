import { z } from 'zod'

/**
 * Documented bill-payment messages (SCREEN-13 COBIL00).
 * Wording follows the legacy ERRMSG texts; trailing "..." is normalized to
 * "." as elsewhere in the app.
 */
export const billPaymentMessages = {
  /** RULE-VAL-064 — COBIL00C.cbl:158-167, "Acct ID can NOT be empty...". */
  accountIdEmpty: 'Acct ID can NOT be empty.',
} as const

/**
 * Bill payment (SCREEN-13 COBIL00). The Account ID is required
 * (RULE-VAL-064); account existence (RULE-VAL-065) and the positive-balance
 * check (RULE-VAL-066) stay server-backed against the looked-up account, and
 * the confirmation (RULE-VAL-067) is supplied by the ConfirmPanel so invalid
 * typed values are unreachable.
 */
export const billPaymentSchema = z.object({
  accountId: z.string().refine((value) => value.trim().length > 0, billPaymentMessages.accountIdEmpty),
  // 'Y' / 'N' set by the ConfirmPanel, mirroring the legacy CONFIRM field.
  confirmation: z.string().optional(),
})

export type BillPaymentFormValues = z.infer<typeof billPaymentSchema>
