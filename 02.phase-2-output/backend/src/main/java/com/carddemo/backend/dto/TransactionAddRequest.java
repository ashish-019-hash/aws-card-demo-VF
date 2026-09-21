package com.carddemo.backend.dto;

import java.math.BigDecimal;

/**
 * Request body for POST /api/transactions (COTRN02 Add Transaction, VR-072..VR-094).
 * Either {@code accountId} or {@code cardNum} must be supplied (VR-074); the write only
 * happens when {@code confirm} is {@code "Y"} (VR-094).
 */
public record TransactionAddRequest(
        Long accountId,
        String cardNum,
        String typeCd,
        Integer catCd,
        String source,
        String description,
        BigDecimal amount,
        String origDate,
        String procDate,
        Long merchantId,
        String merchantName,
        String merchantCity,
        String merchantZip,
        String confirm) {
}
