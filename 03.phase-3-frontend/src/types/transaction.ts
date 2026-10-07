// Field names follow the backend DTOs (TransactionDto / TransactionRequest)
// so Step 3 can wire the API without renaming anything.

export interface Transaction {
  id: string
  transactionTypeCode: string
  transactionCategoryCode: string
  source: string
  description: string
  amount: string
  merchantId: string
  merchantName: string
  merchantCity: string
  merchantZip: string
  cardNumber: string
  originationTimestamp: string
  processingTimestamp: string
}

export interface TransactionListRow {
  id: string
  date: string
  description: string
  amount: string
}
