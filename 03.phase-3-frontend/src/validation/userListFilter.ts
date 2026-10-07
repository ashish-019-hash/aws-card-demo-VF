import { z } from 'zod'

/**
 * User List filter (SCREEN-14 COUSR00): optional user ID that positions the
 * list at that key. Phase 1 defines no validation on this optional start key
 * (COUSR00C treats a blank USRIDIN as "start from the top"), so the schema
 * stays shape-only. RULE-VAL-074 (U/D row selection codes) has no UI path:
 * the list renders labelled Update/Delete row buttons instead.
 */
export const userListFilterSchema = z.object({
  userId: z.string().optional(),
})

export type UserListFilterFormValues = z.infer<typeof userListFilterSchema>
