import type { CreditCard } from '../../types/card'
import type { CardUpdateFormValues } from '../../validation/cardUpdate'
import { splitExpiry } from './format'

export type CardUpdatePhase = 'editing' | 'validated' | 'saving' | 'saved'

/** Maps a fetched card onto the editable field set of SCREEN-08. */
export function cardToFormValues(card: CreditCard): CardUpdateFormValues {
  const { expiryMonth, expiryYear } = splitExpiry(card.expirationDate)
  return {
    embossedName: card.embossedName,
    activeStatus: card.activeStatus,
    expiryMonth,
    expiryYear,
  }
}

/** True when any editable field differs from the fetched baseline. */
export function cardValuesDiffer(a: CardUpdateFormValues, b: CardUpdateFormValues): boolean {
  return (Object.keys(a) as Array<keyof CardUpdateFormValues>).some(
    (key) => (a[key] ?? '') !== (b[key] ?? ''),
  )
}
