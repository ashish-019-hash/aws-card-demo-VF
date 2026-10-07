import { z } from 'zod'
import { userFieldMessages } from '../features/users/messages'

/**
 * User ID lookup (SCREEN-16/17 fetch step).
 *
 * RULE-VAL-077 (COUSR02C PROCESS-ENTER-KEY, lines 145-151) and RULE-VAL-080
 * (COUSR03C PROCESS-ENTER-KEY, lines 144-155) — the User ID is required to
 * look up a user for update or delete; spaces/low-values count as empty.
 *
 * RULE-VAL-079 (user must exist) stays server-backed: the pages map the
 * API's 404 to the documented "User ID NOT found." message.
 */
export const userSearchSchema = z.object({
  userId: z.string().refine((value) => value.trim().length > 0, userFieldMessages.userIdEmpty),
})

export type UserSearchFormValues = z.infer<typeof userSearchSchema>
