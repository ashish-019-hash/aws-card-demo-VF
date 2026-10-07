/** Account view model (ENTITY-002). Field names follow the backend DTOs. */
export interface Account {
  /** 11-digit account number (ACCT-ID). */
  id: string
  /** Optimistic-locking record version; echoed back on updates. */
  version: number
  /** ACCT-ACTIVE-STATUS Y/N. */
  activeStatus: 'Y' | 'N'
  /** Money values are decimal strings, e.g. "1284.50". */
  currentBalance: string
  creditLimit: string
  cashCreditLimit: string
  /** Dates are YYYY-MM-DD strings. */
  openDate: string
  expirationDate: string
  reissueDate: string
  currentCycleCredit: string
  currentCycleDebit: string
  /** Account mailing ZIP — not edited on SCREEN-05; carried for update round-trips. */
  addressZip: string
  groupId: string
}
