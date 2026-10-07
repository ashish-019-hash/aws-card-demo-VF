import type { MessageTone } from '../../components/ui'

/** One page-level message shown through the MessageBar. */
export interface PageMessage {
  tone: MessageTone
  text: string
}

/**
 * Field-level validation messages (Step 4). Wording follows the legacy
 * "... can NOT be empty..." edits; the password length mirrors the API
 * contract (`UserRequest` password `@Size(min = 8, max = 72)`).
 */
export const userFieldMessages = {
  /** RULE-VAL-075 — COUSR01C.cbl PROCESS-ENTER-KEY (lines 117-147). */
  firstNameEmpty: 'First Name can NOT be empty.',
  /** RULE-VAL-075 — COUSR01C.cbl PROCESS-ENTER-KEY (lines 117-147). */
  lastNameEmpty: 'Last Name can NOT be empty.',
  /** RULE-VAL-075/077/080 — COUSR01C.cbl:117-147 / COUSR02C.cbl:145-151 / COUSR03C.cbl:144-155. */
  userIdEmpty: 'User ID can NOT be empty.',
  /** RULE-VAL-075/078 — COUSR01C.cbl:117-147 / COUSR02C.cbl:186-213. */
  passwordEmpty: 'Password can NOT be empty.',
  /** RULE-VAL-075/078 — COUSR01C.cbl:117-147 / COUSR02C.cbl:186-213. */
  userTypeEmpty: 'User Type can NOT be empty.',
  /** Backend contract only: UserRequest password `@Size(min = 8, max = 72)`. */
  passwordLength: 'Password must be 8 to 72 characters.',
} as const

/**
 * Documented user-administration messages (SCREEN-14..17). Wording follows
 * the approved mockups; each entry cites the legacy source of the behavior.
 */
export const userMessages = {
  /** COUSR00C.cbl:251 — F7 on the first page. */
  listAtTop: 'You are already at the top of the page...',
  /** COUSR00C.cbl:273 — F8 on the last page. */
  listAtBottom: 'You are already at the bottom of the page...',
  /** COUSR00C.cbl:610/644/678 — browse failure. */
  lookupFailed: 'Unable to lookup User...',
  /** COUSR02C.cbl:342 / COUSR03C.cbl:289 — fetch of an unknown user ID. */
  userNotFound: 'User ID NOT found.',
  /** COUSR02C.cbl:148 / COUSR03C.cbl:147 — fetch with a blank user ID. */
  userIdEmpty: userFieldMessages.userIdEmpty,
  /** COUSR01C.cbl:138 / COUSR02C.cbl:200 — save with a blank password (the API never returns the stored password, so every save must include one). */
  passwordEmpty: userFieldMessages.passwordEmpty,
  /** COUSR01C.cbl:241-259 — successful add. */
  userAdded: (userId: string) => `User ${userId} has been added.`,
  /** COUSR01C.cbl:260-266 — duplicate user ID on add. */
  duplicateUserId: 'User ID already exists. Choose a different ID.',
  /** COUSR02C.cbl:336 — user fetched, pending update (F5 → Save button). */
  pressSaveToUpdate: 'Press Save to apply your updates.',
  /** COUSR02C.cbl:239-248 — save with no actual change. */
  noChange: 'Please modify to update. No fields were changed.',
  /** COUSR02C.cbl:355-390 — successful update. */
  userUpdated: (userId: string) => `User ${userId} has been updated.`,
  /** COUSR03C.cbl:283 — user fetched, pending delete (F5 → Delete button). */
  reviewThenDelete: 'Review the user, then press Delete user.',
  /** COUSR03C.cbl:303-335 — successful delete. */
  userDeleted: (userId: string) => `User ${userId} has been deleted.`,
} as const
