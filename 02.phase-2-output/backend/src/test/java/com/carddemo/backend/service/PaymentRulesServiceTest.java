package com.carddemo.backend.service;

import com.carddemo.backend.domain.PaymentSettlement;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentRulesServiceTest {

    private final PaymentRulesService paymentRulesService = new PaymentRulesService();

    @Test
    void permitsPaymentOnlyWhenBalanceIsPositive() {
        assertThat(paymentRulesService.isPaymentEligible(new BigDecimal("0.01"))).isTrue();
    }

    @Test
    void rejectsPaymentAtTheZeroBalanceBoundary() {
        assertThat(paymentRulesService.isPaymentEligible(BigDecimal.ZERO)).isFalse();
    }

    @Test
    void rejectsPaymentForNegativeBalance() {
        assertThat(paymentRulesService.isPaymentEligible(new BigDecimal("-0.01"))).isFalse();
    }

    @Test
    void settlesTheEntireCurrentBalanceAndReducesItToZero() {
        PaymentSettlement settlement = paymentRulesService.settleFullBalance(new BigDecimal("123.45"));

        assertThat(settlement.paymentAmount()).isEqualByComparingTo("123.45");
        assertThat(settlement.newCurrentBalance()).isEqualByComparingTo("0.00");
    }
}
