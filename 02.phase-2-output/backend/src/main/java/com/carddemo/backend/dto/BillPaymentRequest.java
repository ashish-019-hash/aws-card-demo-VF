package com.carddemo.backend.dto;

/** Request for POST /api/bill-payments (COBIL00, BR-011/BR-012). {@code confirm} must be "Y" to commit. */
public record BillPaymentRequest(Long accountId, String confirm) {
}
