import { z } from 'zod'

/**
 * Account search (SCREEN-04/05 lookup). Client-applicable parts of the
 * Phase 1 catalog:
 * - RULE-VAL-008/011 — account number must be supplied (COACTVWC.cbl:653-662,
 *   COACTUPC.cbl:1787-1797).
 * - RULE-VAL-009/012 — 11-digit, non-zero number (COACTVWC.cbl:666-676,
 *   COACTUPC.cbl:1802-1817).
 * RULE-VAL-010/013 (account exists in the cross-reference/master files) stay
 * server-backed.
 */
export const accountSearchMessages = {
  /** RULE-VAL-008/011 — legacy WS-PROMPT-FOR-ACCT. */
  accountNotProvided: 'Account number not provided',
  /** RULE-VAL-009/012 — approved mockup wording of the legacy edit message. */
  invalidAccountNumber: 'Account number must be a non-zero 11-digit number.',
} as const

export const accountSearchSchema = z.object({
  accountId: z.string().superRefine((value, ctx) => {
    const v = value.trim()
    if (v === '') {
      ctx.addIssue({ code: 'custom', message: accountSearchMessages.accountNotProvided })
    } else if (!/^\d{11}$/.test(v) || /^0{11}$/.test(v)) {
      ctx.addIssue({ code: 'custom', message: accountSearchMessages.invalidAccountNumber })
    }
  }),
})

export type AccountSearchFormValues = z.infer<typeof accountSearchSchema>
