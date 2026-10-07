package com.aws.carddemo.dto;

import java.math.BigDecimal;

public record TransactionDto(
        String id,
        String transactionTypeCode,
        Integer transactionCategoryCode,
        String source,
        String description,
        BigDecimal amount,
        Long merchantId,
        String merchantName,
        String merchantCity,
        String merchantZip,
        String cardNumber,
        String originationTimestamp,
        String processingTimestamp) { }
