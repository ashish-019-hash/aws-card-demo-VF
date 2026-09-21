/**
 * Known-good seed data read directly from the running backend (see e2e/TRACEABILITY.md
 * for how these were captured). These values are stable across backend restarts because
 * they come from the Flyway/seed-loader data set described in the backend README, but if
 * the seed data is ever regenerated, re-verify these IDs with:
 *   curl -s localhost:8080/api/cards?page=0
 *   curl -s localhost:8080/api/accounts/<id>
 */

export const SEED_USERS = {
  admin: { userId: 'ADMIN001', password: 'PASSWORD' },
  regular: { userId: 'USER0001', password: 'PASSWORD' },
} as const

/** Account used for read-only lookups (View Account / Card List / Card View). Never mutated. */
export const READONLY_ACCOUNT_ID = '10'
export const READONLY_ACCOUNT_CARD_NUM = '3260763612337560'

/** A second read-only account, distinct from READONLY_ACCOUNT_ID, for cross-filter checks. */
export const READONLY_ACCOUNT_ID_2 = '20'

/** Dedicated account for Account Update mutation tests. Restored after each test. */
export const MUTABLE_ACCOUNT_ID = '9'

/** Dedicated card for Card Update mutation tests (belongs to account 20). Restored after each test. */
export const MUTABLE_CARD_NUM = '0927987108636232'

/** Dedicated account with a positive balance, reserved for Bill Payment happy-path tests.
 *  Balance is restored via PUT /api/accounts/{id} in test teardown, which re-validates every
 *  field (not just the balance) — so this account's seed phone/zip data was normalized
 *  directly in the database (was originally invalid: trailing-space-padded phone numbers and
 *  a zip/state combo not in valid-state-zip.txt, which made every teardown PUT 422 and
 *  silently fail to restore the balance). See MUTABLE_ACCOUNT_ID's account (9) for the same
 *  class of seed-data-quality issue. */
export const BILL_PAYMENT_ACCOUNT_ID = '15'

/** A distinct account whose seed balance is already zero (0.00 in acctdata.txt), used for
 *  the "nothing to pay" scenario (STORY-038). Deliberately a different account from
 *  BILL_PAYMENT_ACCOUNT_ID so the two scenarios do not depend on each other's run order. */
export const BILL_PAYMENT_ACCOUNT_ID_ZERO_BAL_SOURCE = '13'

/** A card number known to exist, used as the "copy last transaction" source (STORY-032). */
export const TRANSACTION_SOURCE_CARD_NUM = '0500024453765740'

/** A transaction ID known to exist (from the seed data), for jump-to and view-by-id tests. */
export const KNOWN_TRANSACTION_ID = '0000000000683580'

/** An account ID guaranteed to have no application user with this ID, for uniqueness tests. */
export function uniqueTestUserId(): string {
  // 8-char max (VR field width): "E2" + up to 6 digits from the current time.
  const suffix = Date.now().toString().slice(-6)
  return `E2${suffix}`
}

export function uniqueGroupId(): string {
  return `G${Date.now().toString().slice(-6)}`
}
