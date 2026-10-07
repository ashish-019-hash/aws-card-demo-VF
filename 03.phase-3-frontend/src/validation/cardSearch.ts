import { z } from 'zod'

/**
 * Card lookup (SCREEN-07/08 entry). Client-applicable parts of the Phase 1
 * catalog:
 * - RULE-VAL-039/042 — account number supplied (blank/zero prompts) and an
 *   11-digit number (COCRDSLC.cbl:647-681, COCRDUPC.cbl:721-756).
 * - RULE-VAL-040/043 — card number supplied (blank/zero prompts) and a
 *   16-digit number (COCRDSLC.cbl:685-720, COCRDUPC.cbl:762-800).
 * RULE-VAL-041/044 (account/card combination exists) stay server-backed.
 */
export const cardSearchMessages = {
  /** RULE-VAL-039/042 — legacy WS-PROMPT-FOR-ACCT. */
  accountNotProvided: 'Account number not provided',
  /** RULE-VAL-040/043 — legacy WS-PROMPT-FOR-CARD. */
  cardNotProvided: 'Card number not provided',
  /** RULE-VAL-039/042 — approved mockup wording of the legacy edit message. */
  invalidAccountNumber: 'Account number must be a non-zero 11-digit number.',
  /** RULE-VAL-040/043 — approved mockup wording of the legacy edit message. */
  invalidCardNumber: 'Card number must be a 16-digit number.',
} as const

function requiredDigitsKey(length: number, notProvided: string, invalid: string) {
  return z.string().superRefine((value, ctx) => {
    const v = value.trim()
    if (v === '' || /^0+$/.test(v)) {
      ctx.addIssue({ code: 'custom', message: notProvided })
    } else if (!new RegExp(`^\\d{${length}}$`).test(v)) {
      ctx.addIssue({ code: 'custom', message: invalid })
    }
  })
}

export const cardSearchSchema = z.object({
  accountId: requiredDigitsKey(
    11,
    cardSearchMessages.accountNotProvided,
    cardSearchMessages.invalidAccountNumber,
  ),
  cardNumber: requiredDigitsKey(
    16,
    cardSearchMessages.cardNotProvided,
    cardSearchMessages.invalidCardNumber,
  ),
})

export type CardSearchFormValues = z.infer<typeof cardSearchSchema>
