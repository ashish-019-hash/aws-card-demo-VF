import { z } from 'zod'

/**
 * Credit Card Update form (SCREEN-08 COCRDUP). Client-applicable parts of the
 * Phase 1 catalog:
 * - RULE-VAL-045 — embossed name required, alphabets and spaces only
 *   (COCRDUPC.cbl:806-840).
 * - RULE-VAL-046 — card active status Y or N (COCRDUPC.cbl:845-873).
 * - RULE-VAL-047 — expiry month 1-12 (COCRDUPC.cbl:877-908).
 * - RULE-VAL-048 — expiry year 1950-2099 (COCRDUPC.cbl:913-944).
 * RULE-VAL-049: no-change detection stays page-level; the optimistic
 * concurrency check stays server-backed. Expiry month and year remain two
 * fields, matching the legacy screen.
 */
export const cardUpdateMessages = {
  /** RULE-VAL-045 — legacy WS-PROMPT-FOR-NAME. */
  nameNotProvided: 'Card name not provided',
  /** RULE-VAL-045 — legacy COCRDUPC.cbl:184. */
  nameMustBeAlpha: 'Card name can only contain alphabets and spaces',
  /** RULE-VAL-046 — legacy CARD-STATUS-MUST-BE-YES-NO. */
  statusMustBeYesNo: 'Card Active Status must be Y or N',
  /** RULE-VAL-047 — legacy CARD-EXPIRY-MONTH-NOT-VALID. */
  invalidExpiryMonth: 'Card expiry month must be between 1 and 12',
  /** RULE-VAL-048 — legacy CARD-EXPIRY-YEAR-NOT-VALID (valid years 1950-2099). */
  invalidExpiryYear: 'Invalid card expiry year',
} as const

export const cardUpdateSchema = z.object({
  // RULE-VAL-045
  embossedName: z.string().superRefine((value, ctx) => {
    const v = value.trim()
    if (v === '') {
      ctx.addIssue({ code: 'custom', message: cardUpdateMessages.nameNotProvided })
    } else if (!/^[A-Za-z ]+$/.test(v)) {
      ctx.addIssue({ code: 'custom', message: cardUpdateMessages.nameMustBeAlpha })
    }
  }),
  // RULE-VAL-046
  activeStatus: z
    .string()
    .refine((value) => ['Y', 'N'].includes(value), cardUpdateMessages.statusMustBeYesNo),
  // RULE-VAL-047
  expiryMonth: z.string().refine((value) => {
    const v = value.trim()
    return /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 12
  }, cardUpdateMessages.invalidExpiryMonth),
  // RULE-VAL-048
  expiryYear: z.string().refine((value) => {
    const v = value.trim()
    return /^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2099
  }, cardUpdateMessages.invalidExpiryYear),
})

export type CardUpdateFormValues = z.infer<typeof cardUpdateSchema>
