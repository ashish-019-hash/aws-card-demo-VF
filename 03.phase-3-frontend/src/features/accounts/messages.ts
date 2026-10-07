import { accountSearchMessages } from '../../validation/accountSearch'

/**
 * Documented account-servicing messages (SCREEN-04 COACTVW, SCREEN-05
 * COACTUP). Wording follows the approved mockups; each entry cites the
 * legacy source of the behavior.
 */
export const accountMessages = {
  /** COACTVWC.cbl:622-686 / COACTUPC.cbl:1429-1500 — account number edit (RULE-VAL-009/012). */
  invalidAccountNumber: accountSearchMessages.invalidAccountNumber,
  /** COACTVWC.cbl:731-767 — cross-reference lookup miss. */
  accountNotFound: (accountId: string) =>
    `Account ${accountId} was not found in the card cross-reference file.`,
  /** COACTUPC.cbl:2585-2590 — all edits passed, F5=Save offered. */
  changesValidated:
    'Changes validated. Save to commit them, or discard to reload the original details.',
  /** COACTUPC.cbl:2627-2635 — successful rewrite of both records. */
  changesSaved: 'Changes committed to database.',
  /** COACTUPC.cbl — Enter with edits that match the fetched values. */
  noChange: 'No change detected with respect to values fetched.',
  /** Submit with shape errors — fix highlighted fields (Step 4 adds rules). */
  fixFields: 'Some fields need attention. Fix the highlighted fields and try again.',
} as const
