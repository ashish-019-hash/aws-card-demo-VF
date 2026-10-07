/**
 * Step 3 — card servicing against the real backend (SCREEN-06/07/08).
 * Maps the numeric backend DTOs onto the string-based display types and
 * keeps the shape-level input checks the preview helpers used to apply.
 */
import { ApiError, api } from '../../services/api'
import type { CreditCardDto, CreditCardUpdateRequest } from '../../services/api'
import type { CardListRow, CreditCard } from '../../types/card'
import type { CardUpdateFormValues } from '../../validation/cardUpdate'
import { cardMessages } from './messages'

/** Legacy COCRDLI shows seven cards per page. */
export const CARD_PAGE_SIZE = 7

export type LookupResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export interface CardListFilters {
  accountId?: string
  cardNumber?: string
}

/** One resolved list page plus the backend page metadata the UI needs. */
export interface CardListPageData {
  rows: CardListRow[]
  totalPages: number
}

/** Shown when the request itself fails (network down, server error without detail). */
export const serviceUnavailableMessage =
  'The card service is not available right now. Try again.'

const padAccountId = (accountId: number) => String(accountId).padStart(11, '0')

export function toCreditCard(dto: CreditCardDto): CreditCard {
  return {
    cardNumber: dto.cardNumber,
    version: dto.version,
    accountId: padAccountId(dto.accountId),
    cvvCode: dto.cvvCode,
    embossedName: dto.embossedName,
    expirationDate: dto.expirationDate,
    activeStatus: dto.activeStatus,
  }
}

const toRow = (dto: CreditCardDto): CardListRow => ({
  accountId: padAccountId(dto.accountId),
  cardNumber: dto.cardNumber,
  activeStatus: dto.activeStatus,
})

function failureMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : serviceUnavailableMessage
}

/**
 * Resolve one card-list page. Unfiltered browsing uses the backend's page
 * metadata; an account filter uses the by-account endpoint (unpaged, sliced
 * locally); a card-number filter resolves to at most one row.
 */
export async function fetchCardListPage(
  filters: CardListFilters,
  page: number,
): Promise<LookupResult<CardListPageData>> {
  const accountId = filters.accountId?.trim() ?? ''
  const cardNumber = filters.cardNumber?.trim() ?? ''
  if (accountId !== '' && !/^\d{11}$/.test(accountId)) {
    return { ok: false, message: cardMessages.invalidAccountFilter }
  }
  if (cardNumber !== '' && !/^\d{16}$/.test(cardNumber)) {
    return { ok: false, message: cardMessages.invalidCardFilter }
  }
  try {
    if (cardNumber !== '') {
      let card: CreditCardDto | null = null
      try {
        card = await api.cards.get(cardNumber)
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error
        }
      }
      const matches =
        card !== null && (accountId === '' || Number(accountId) === card.accountId)
      return {
        ok: true,
        data: { rows: matches && card ? [toRow(card)] : [], totalPages: 1 },
      }
    }
    if (accountId !== '') {
      const cards = await api.cards.byAccount(accountId)
      const totalPages = Math.max(1, Math.ceil(cards.length / CARD_PAGE_SIZE))
      const rows = cards
        .slice((page - 1) * CARD_PAGE_SIZE, page * CARD_PAGE_SIZE)
        .map(toRow)
      return { ok: true, data: { rows, totalPages } }
    }
    const response = await api.cards.list(page - 1, CARD_PAGE_SIZE)
    return {
      ok: true,
      data: {
        rows: response.content.map(toRow),
        totalPages: Math.max(1, response.page.totalPages),
      },
    }
  } catch (error) {
    return { ok: false, message: failureMessage(error) }
  }
}

/**
 * Fetch one card. The backend endpoint is keyed by card number alone, so
 * when the screen supplies an account number too it is verified against the
 * returned card — a mismatch reports the legacy account/card miss message.
 */
export async function fetchCard(
  accountId: string,
  cardNumber: string,
): Promise<LookupResult<CreditCard>> {
  const acct = accountId.trim()
  const num = cardNumber.trim()
  if (!/^\d{11}$/.test(acct) || /^0{11}$/.test(acct)) {
    return { ok: false, message: cardMessages.invalidAccountNumber }
  }
  if (!/^\d{16}$/.test(num)) {
    return { ok: false, message: cardMessages.invalidCardNumber }
  }
  if (/^0{16}$/.test(num)) {
    return { ok: false, message: cardMessages.cardNotFound }
  }
  try {
    const dto = await api.cards.get(num)
    if (dto.accountId !== Number(acct)) {
      return { ok: false, message: cardMessages.cardNotFound }
    }
    return { ok: true, data: toCreditCard(dto) }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { ok: false, message: cardMessages.cardNotFound }
    }
    return { ok: false, message: failureMessage(error) }
  }
}

/**
 * Builds the expiry date sent to the backend: the month and year come from
 * the form, and the stored day-of-month is kept where it is still a valid
 * day of the selected month, otherwise clamped to that month's last day
 * (e.g. stored day 31 with February selected becomes 28, or 29 in a leap
 * year). The screen only ever shows month and year, so the day is a hidden
 * carry-over that must never make the date invalid.
 */
export function buildExpirationDate(storedDate: string, expiryMonth: string, expiryYear: string): string {
  const year = Number(expiryYear)
  const month = Number(expiryMonth)
  const storedDay = Number(storedDate.split('-')[2] ?? '1') || 1
  // Date.UTC months are 0-based, so day 0 of the next month is the last day
  // of the selected (1-based) month.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const day = Math.min(storedDay, lastDay)
  return `${expiryYear}-${expiryMonth.padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Persist the edited SCREEN-08 field set with the optimistic version from
 * the fetch. Month and year come from the form; the day-of-month of the
 * stored expiry date is preserved where valid and clamped to the selected
 * month's last day otherwise.
 */
export async function saveCard(
  card: CreditCard,
  values: CardUpdateFormValues,
): Promise<LookupResult<CreditCard>> {
  const request: CreditCardUpdateRequest = {
    version: card.version,
    accountId: Number(card.accountId),
    cvvCode: card.cvvCode,
    embossedName: values.embossedName,
    expirationDate: buildExpirationDate(card.expirationDate, values.expiryMonth, values.expiryYear),
    activeStatus: values.activeStatus as 'Y' | 'N',
  }
  try {
    const updated = await api.cards.update(card.cardNumber, request)
    return { ok: true, data: toCreditCard(updated) }
  } catch (error) {
    return { ok: false, message: failureMessage(error) }
  }
}
