package com.aws.carddemo.service;

import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class BillPaymentRules {
    public static final String TRANSACTION_TYPE = "02";
    public static final int TRANSACTION_CATEGORY = 2;
    public static final String SOURCE = "POS TERM";
    public static final String DESCRIPTION = "BILL PAYMENT - ONLINE";
    public static final long MERCHANT_ID = 999_999_999L;
    public static final String MERCHANT_NAME = "BILL PAYMENT";

    public PaymentDecision decide(BigDecimal currentBalance, String confirmation) {
        if (currentBalance == null || currentBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentDecision.NOTHING_TO_PAY;
        }
        if (confirmation == null || confirmation.isBlank()) {
            return PaymentDecision.CONFIRMATION_REQUIRED;
        }
        return switch (confirmation.trim().toUpperCase()) {
            case "Y" -> PaymentDecision.EXECUTE;
            case "N" -> PaymentDecision.CANCELLED;
            default -> PaymentDecision.INVALID_CONFIRMATION;
        };
    }

    public Settlement settleFullBalance(BigDecimal currentBalance, String cardNumber) {
        if (currentBalance == null || currentBalance.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A positive balance is required for payment");
        }
        if (cardNumber == null || cardNumber.isBlank()) {
            throw new IllegalArgumentException("A linked card is required for payment");
        }
        return new Settlement(
                currentBalance,
                BigDecimal.ZERO.setScale(currentBalance.scale()),
                cardNumber,
                TRANSACTION_TYPE,
                TRANSACTION_CATEGORY,
                SOURCE,
                DESCRIPTION,
                MERCHANT_ID,
                MERCHANT_NAME);
    }

    public enum PaymentDecision {
        EXECUTE,
        CANCELLED,
        CONFIRMATION_REQUIRED,
        INVALID_CONFIRMATION,
        NOTHING_TO_PAY
    }

    public record Settlement(
            BigDecimal paymentAmount,
            BigDecimal resultingBalance,
            String cardNumber,
            String transactionType,
            int transactionCategory,
            String source,
            String description,
            long merchantId,
            String merchantName) { }
}
