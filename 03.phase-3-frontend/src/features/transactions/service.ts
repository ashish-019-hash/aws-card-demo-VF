// Step 3 — maps the backend transaction API (services/api) onto the
// screen-level domain types used by the transaction screens.
import { api, ApiError, type TransactionDto } from '../../services/api'
import { fetchPositionedPage } from '../../services/positionedList'
import type { Transaction, TransactionListRow } from '../../types/transaction'

export const TRANSACTIONS_PAGE_SIZE = 10

/** Converts a backend TransactionDto to the screen's string-based Transaction. */
export function toTransaction(dto: TransactionDto): Transaction {
  return {
    id: dto.id,
    transactionTypeCode: dto.transactionTypeCode,
    transactionCategoryCode: String(dto.transactionCategoryCode),
    source: dto.source,
    description: dto.description,
    amount: dto.amount.toFixed(2),
    merchantId: String(dto.merchantId),
    merchantName: dto.merchantName,
    merchantCity: dto.merchantCity,
    merchantZip: dto.merchantZip,
    cardNumber: dto.cardNumber,
    originationTimestamp: dto.originationTimestamp,
    processingTimestamp: dto.processingTimestamp,
  }
}

export function toListRow(transaction: Transaction): TransactionListRow {
  return {
    id: transaction.id,
    date: transaction.originationTimestamp.slice(0, 10),
    description: transaction.description,
    amount: transaction.amount,
  }
}

/** Zero-pads an entered transaction ID to the stored 16-digit form. */
export function normalizeTransactionId(value: string): string {
  return value.trim().padStart(16, '0')
}

/**
 * Normalizes a decimal amount ("86.42", "-950") to the strict signed format
 * ("+00000086.42") required by RULE-VAL-059 and the backend. Used to prefill
 * the form from a copied transaction; values already in the strict form pass
 * through unchanged, and anything else is returned as typed so the form
 * validation (transactionAdd schema) reports the format error.
 */
export function toSignedAmount(value: string): string {
  const match = /^([+-]?)(\d{1,8})(?:\.(\d{0,2}))?$/.exec(value.trim())
  if (!match) return value.trim()
  const sign = match[1] === '-' ? '-' : '+'
  return `${sign}${match[2].padStart(8, '0')}.${(match[3] ?? '').padEnd(2, '0')}`
}

export interface TransactionListPageData {
  rows: TransactionListRow[]
  hasNext: boolean
}

/**
 * Resolves one page of the transaction list, positioned at the optional
 * starting transaction ID (legacy TRNIDIN behavior). The backend has no
 * start-ID filter, so the positioned case locates the start offset in the
 * id-ascending list with a bounded binary search and reads the display page
 * from there — honest for any file size, unlike a fixed scanned window.
 */
export async function fetchTransactionPage(startId: string | undefined, page: number): Promise<TransactionListPageData> {
  if (!startId) {
    const response = await api.transactions.list(page, TRANSACTIONS_PAGE_SIZE)
    return {
      rows: response.content.map((dto) => toListRow(toTransaction(dto))),
      hasNext: response.page.number + 1 < response.page.totalPages,
    }
  }
  const normalized = normalizeTransactionId(startId)
  const positioned = await fetchPositionedPage(
    (pageNumber, size) => api.transactions.list(pageNumber, size),
    (dto) => dto.id,
    normalized,
    page,
    TRANSACTIONS_PAGE_SIZE,
  )
  return {
    rows: positioned.items.map((dto) => toListRow(toTransaction(dto))),
    hasNext: positioned.hasNext,
  }
}

/** Legacy COTRN02C xref messages (READ-CXACAIX-FILE / READ-CCXREF-FILE). */
export const transactionKeyMessages = {
  accountNotFound: 'Account ID NOT found.',
  cardNotFound: 'Card Number NOT found.',
} as const

export type ResolvedTransactionKeys =
  | { ok: true; accountId: string; cardNumber: string }
  | { ok: false; field: 'accountId' | 'cardNumber'; message: string }

/**
 * Resolves the entered target keys through the card cross-reference before a
 * copy, mirroring legacy VALIDATE-INPUT-KEY-FIELDS: an entered account takes
 * precedence and is looked up in the by-account xref (overwriting the card
 * number from it), otherwise the card is looked up (filling the account).
 * This matches COTRN02C, where a valid account always selects its linked card.
 */
export async function resolveTransactionKeys(accountId: string, cardNumber: string): Promise<ResolvedTransactionKeys> {
  const account = accountId.trim()
  const card = cardNumber.trim()
  if (account) {
    let cards
    try {
      cards = await api.cards.byAccount(account)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { ok: false, field: 'accountId', message: transactionKeyMessages.accountNotFound }
      }
      throw error
    }
    if (cards.length === 0) {
      return { ok: false, field: 'accountId', message: transactionKeyMessages.accountNotFound }
    }
    return { ok: true, accountId: account, cardNumber: cards[0].cardNumber }
  }
  try {
    const dto = await api.cards.get(card)
    return { ok: true, accountId: String(dto.accountId).padStart(11, '0'), cardNumber: card }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { ok: false, field: 'cardNumber', message: transactionKeyMessages.cardNotFound }
    }
    throw error
  }
}

/** The most recent transaction on file, or null when the file is empty (legacy F5). */
export async function fetchLastTransaction(): Promise<Transaction | null> {
  const probe = await api.transactions.list(0, 1)
  const total = probe.page.totalElements
  if (total <= 0) return null
  // The list is sorted by ID ascending, so with size 1 the last page index is total - 1.
  const lastPage = total === 1 ? probe : await api.transactions.list(total - 1, 1)
  const dto = lastPage.content[0]
  return dto ? toTransaction(dto) : null
}

/** The ID a new transaction is written under: last stored ID + 1 (legacy COTRN02). */
export function nextTransactionId(lastId: string | null): string {
  if (!lastId || !/^\d+$/.test(lastId)) return '1'.padStart(16, '0')
  return String(BigInt(lastId) + 1n).padStart(16, '0')
}

/** Maps a thrown value to the screen-level error message. */
export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}
