package com.carddemo.backend.dto;

import java.math.BigDecimal;

/** Response for POST /api/bill-payments. */
public record BillPaymentResponse(boolean paid, String tranId, BigDecimal amountPaid, BigDecimal newBalance,
                                   String message) {
}
