/** Credit card view model (ENTITY-003). Field names follow the backend DTOs. */
export interface CreditCard {
  /** 16-digit card number (CARD-NUM). */
  cardNumber: string
  /** Optimistic-locking record version; echoed back on updates. */
  version: number
  /** 11-digit owning account number (CARD-ACCT-ID). */
  accountId: string
  /** CVV — not displayed; carried for update round-trips. */
  cvvCode: number
  /** CARD-EMBOSSED-NAME. */
  embossedName: string
  /** Full expiry date YYYY-MM-DD (month and year are edited separately on SCREEN-08). */
  expirationDate: string
  /** CARD-ACTIVE-STATUS Y/N. */
  activeStatus: 'Y' | 'N'
}

/** One row of the Credit Card List (SCREEN-06). */
export interface CardListRow {
  accountId: string
  cardNumber: string
  activeStatus: 'Y' | 'N'
}
