import { cardListFilterMessages } from '../../validation/cardListFilter'
import { cardSearchMessages } from '../../validation/cardSearch'

/**
 * Documented card-servicing messages (SCREEN-06 COCRDLI, SCREEN-07 COCRDSL,
 * SCREEN-08 COCRDUP). Wording follows the approved mockups; each entry cites
 * the legacy source of the behavior.
 */
export const cardMessages = {
  /** COCRDLIC.cbl:951-1000 — account filter edit (RULE-VAL-035). */
  invalidAccountFilter: cardListFilterMessages.invalidAccountFilter,
  /** COCRDLIC.cbl:951-1000 — card filter edit (RULE-VAL-036). */
  invalidCardFilter: cardListFilterMessages.invalidCardFilter,
  /** COCRDLIC.cbl:440-455,901-904 — F7 on the first page. */
  noPreviousPages: 'NO PREVIOUS PAGES TO DISPLAY',
  /** COCRDLIC.cbl:905-909 — F8 on the last page. */
  noMorePages: 'NO MORE PAGES TO DISPLAY',
  /** COCRDSLC.cbl:582-700 / COCRDUPC.cbl:641-1000 — key edits (RULE-VAL-039/040/042/043). */
  invalidAccountNumber: cardSearchMessages.invalidAccountNumber,
  invalidCardNumber: cardSearchMessages.invalidCardNumber,
  /** COCRDSLC.cbl:752-776 — card file lookup miss. */
  cardNotFound: 'Did not find this account/card combination.',
  /** COCRDUPC.cbl:414-420 — edits passed, F5=Save offered. */
  changesValidated:
    'Changes validated. Save to commit them, or discard to reload the original card.',
  /** COCRDUPC.cbl:1470-1490 — successful rewrite. */
  changesSaved: 'Changes committed to database.',
  /** COCRDUPC.cbl:435-440,467-477 — save completed after arriving from the list. */
  changesSavedReturning: 'Changes committed to database. Returning to the card list.',
  /** Enter with edits that match the fetched values. */
  noChange: 'No change detected with respect to values fetched.',
} as const
