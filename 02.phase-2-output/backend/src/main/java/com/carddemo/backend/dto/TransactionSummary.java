package com.carddemo.backend.dto;

import java.math.BigDecimal;

/** A single row in the transaction list (COTRN00, BR-015: page size 10). */
public record TransactionSummary(String tranId, String origTs, String description, BigDecimal amount) {
}
