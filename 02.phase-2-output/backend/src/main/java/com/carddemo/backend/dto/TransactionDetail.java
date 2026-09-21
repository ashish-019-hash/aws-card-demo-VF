package com.carddemo.backend.dto;

import java.math.BigDecimal;

/** GET /api/transactions/{id} full detail (COTRN01). */
public record TransactionDetail(String tranId, String cardNum, String typeCd, Integer catCd, String source,
                                 String description, BigDecimal amount, String origTs, String procTs,
                                 Long merchantId, String merchantName, String merchantCity, String merchantZip) {
}
