import { z } from 'zod'

/**
 * Sign-on form validation (SCREEN-01 COSGN00). Client-applicable parts of the
 * Phase 1 catalog:
 * - RULE-VAL-001 — User ID must be entered (COSGN00C.cbl:118-122).
 * - RULE-VAL-002 — Password must be entered (COSGN00C.cbl:123-127).
 * RULE-VAL-003 (user exists) and RULE-VAL-004 (password match) stay
 * server-backed; the page shows the API error message.
 */
export const signInMessages = {
  /** RULE-VAL-001 — COSGN00C.cbl:120. */
  userIdRequired: 'Please enter User ID ...',
  /** RULE-VAL-002 — COSGN00C.cbl:125. */
  passwordRequired: 'Please enter Password ...',
} as const

export const signInSchema = z.object({
  userId: z.string().refine((value) => value.trim() !== '', signInMessages.userIdRequired),
  password: z.string().refine((value) => value.trim() !== '', signInMessages.passwordRequired),
})

export type SignInFormValues = z.infer<typeof signInSchema>
