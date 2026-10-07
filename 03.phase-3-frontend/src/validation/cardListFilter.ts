import { z } from 'zod'

/**
 * Credit Card List filters (SCREEN-06 COCRDLI). Client-applicable parts of
 * the Phase 1 catalog:
 * - RULE-VAL-035 — account filter optional; blank/zero means "no filter", a
 *   supplied value must be an 11-digit number (COCRDLIC.cbl:1003-1030).
 * - RULE-VAL-036 — card filter optional; blank/zero accepted, a supplied
 *   value must be a 16-digit number (COCRDLIC.cbl:1036-1067).
 * RULE-VAL-037/038 (S/U row-selection codes) have no UI path: list rows carry
 * labelled View/Update buttons (approved decision 1).
 */
export const cardListFilterMessages = {
  /** RULE-VAL-035 — approved mockup wording of the legacy filter edit. */
  invalidAccountFilter: 'Account number must be an 11-digit number.',
  /** RULE-VAL-036 — approved mockup wording of the legacy filter edit. */
  invalidCardFilter: 'Card number must be a 16-digit number.',
} as const

function optionalDigitsFilter(length: number, message: string) {
  return z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      const v = (value ?? '').trim()
      if (v === '' || /^0+$/.test(v)) return // blank/zero means "no filter"
      if (!new RegExp(`^\\d{${length}}$`).test(v)) {
        ctx.addIssue({ code: 'custom', message })
      }
    })
}

export const cardListFilterSchema = z.object({
  accountId: optionalDigitsFilter(11, cardListFilterMessages.invalidAccountFilter),
  cardNumber: optionalDigitsFilter(16, cardListFilterMessages.invalidCardFilter),
})

export type CardListFilterFormValues = z.infer<typeof cardListFilterSchema>
