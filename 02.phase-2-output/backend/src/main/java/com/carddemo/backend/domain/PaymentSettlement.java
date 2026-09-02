package com.carddemo.backend.domain;

import java.math.BigDecimal;

/**
 * The amounts produced when a confirmed online payment settles an account.
 */
public record PaymentSettlement(BigDecimal paymentAmount, BigDecimal newCurrentBalance) {
}
