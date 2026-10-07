import { z } from 'zod'
import { userFieldMessages } from '../features/users/messages'

/** A legacy "can NOT be empty" edit: spaces/low-values count as empty. */
const requiredField = (message: string) =>
  z.string().refine((value) => value.trim().length > 0, message)

/**
 * User Add form (SCREEN-15 COUSR01).
 *
 * RULE-VAL-075 — First Name, Last Name, User ID, Password and User Type are
 * all required (COUSR01C PROCESS-ENTER-KEY, lines 117-147). The key order
 * matches the legacy check order, so the first invalid field receives focus
 * on submit.
 *
 * The password length mirrors the API contract (UserRequest
 * `@Size(min = 8, max = 72)`) and runs only after the required check.
 *
 * RULE-VAL-076 (duplicate User ID) stays server-backed: the page maps the
 * API's 409 conflict to the documented message.
 */
export const userAddSchema = z.object({
  firstName: requiredField(userFieldMessages.firstNameEmpty),
  lastName: requiredField(userFieldMessages.lastNameEmpty),
  userId: requiredField(userFieldMessages.userIdEmpty),
  password: requiredField(userFieldMessages.passwordEmpty).refine(
    (value) => value.trim().length === 0 || (value.length >= 8 && value.length <= 72),
    userFieldMessages.passwordLength,
  ),
  userType: requiredField(userFieldMessages.userTypeEmpty),
})

export type UserAddFormValues = z.infer<typeof userAddSchema>
