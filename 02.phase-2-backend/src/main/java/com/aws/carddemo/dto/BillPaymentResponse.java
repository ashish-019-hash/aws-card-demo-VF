package com.aws.carddemo.dto;

import java.math.BigDecimal;

public record BillPaymentResponse(Long accountId, String cardNumber, String transactionId,
        BigDecimal amount, BigDecimal resultingBalance) { }
