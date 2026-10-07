import { z } from 'zod'
import { userFieldMessages } from '../features/users/messages'

/** A legacy "can NOT be empty" edit: spaces/low-values count as empty. */
const requiredField = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, message)

/**
 * User Update form (SCREEN-16 COUSR02): the fetched user ID plus the four
 * editable fields.
 *
 * RULE-VAL-077 — the User ID is required (COUSR02C PROCESS-ENTER-KEY lines
 * 145-151 / UPDATE-USER-INFO lines 180-186). The field is read-only and
 * prefilled from the fetch, so the rule only guards programmatic misuse.
 *
 * RULE-VAL-078 — First Name, Last Name, Password and User Type are all
 * required on save (COUSR02C UPDATE-USER-INFO, lines 186-213). The stored
 * password is never returned by the API, so the administrator must always
 * type one; its length mirrors the API contract (UserRequest
 * `@Size(min = 8, max = 72)`) after the required check.
 *
 * RULE-VAL-079 (user must exist) and RULE-VAL-081 (at least one field must
 * change) stay server-backed; the page maps 404 and the "must change" 400 to
 * the documented messages.
 */
export const userUpdateSchema = z.object({
  userId: requiredField(userFieldMessages.userIdEmpty),
  firstName: requiredField(userFieldMessages.firstNameEmpty),
  lastName: requiredField(userFieldMessages.lastNameEmpty),
  password: requiredField(userFieldMessages.passwordEmpty).refine(
    (value) => value.trim().length === 0 || (value.length >= 8 && value.length <= 72),
    userFieldMessages.passwordLength,
  ),
  userType: requiredField(userFieldMessages.userTypeEmpty),
})

export type UserUpdateFormValues = z.infer<typeof userUpdateSchema>
