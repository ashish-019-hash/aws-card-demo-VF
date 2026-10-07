// Field names follow the backend BillPaymentRequest/BillPaymentResponse DTOs.
export interface BillPaymentSummary {
  accountId: string
  currentBalance: string
}

/** Screen-level view of the backend BillPaymentResponse. */
export interface BillPaymentReceipt {
  transactionId: string
  amountPaid: string
  newBalance: string
}
