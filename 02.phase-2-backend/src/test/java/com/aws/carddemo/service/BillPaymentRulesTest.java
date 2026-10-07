package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class BillPaymentRulesTest {
    private final BillPaymentRules rules = new BillPaymentRules();

    @Test
    void ruleCalc001SettlesTheFullBalanceWithFixedClassification() {
        BillPaymentRules.Settlement settlement = rules.settleFullBalance(
                new BigDecimal("125.75"), "1111222233334444");

        assertThat(settlement.paymentAmount()).isEqualByComparingTo("125.75");
        assertThat(settlement.resultingBalance()).isEqualByComparingTo("0.00");
        assertThat(settlement.cardNumber()).isEqualTo("1111222233334444");
        assertThat(settlement.transactionType()).isEqualTo("02");
        assertThat(settlement.transactionCategory()).isEqualTo(2);
        assertThat(settlement.source()).isEqualTo("POS TERM");
        assertThat(settlement.description()).isEqualTo("BILL PAYMENT - ONLINE");
        assertThat(settlement.merchantId()).isEqualTo(999_999_999L);
        assertThat(settlement.merchantName()).isEqualTo("BILL PAYMENT");
    }

    @Test
    void ruleThreshold001BlocksZeroOrNegativeBalances() {
        assertThat(rules.decide(BigDecimal.ZERO, "Y"))
                .isEqualTo(BillPaymentRules.PaymentDecision.NOTHING_TO_PAY);
        assertThat(rules.decide(new BigDecimal("-1.00"), "Y"))
                .isEqualTo(BillPaymentRules.PaymentDecision.NOTHING_TO_PAY);
    }

    @Test
    void ruleDecision001RequiresExplicitConfirmation() {
        BigDecimal balance = new BigDecimal("25.00");
        assertThat(rules.decide(balance, null))
                .isEqualTo(BillPaymentRules.PaymentDecision.CONFIRMATION_REQUIRED);
        assertThat(rules.decide(balance, "N"))
                .isEqualTo(BillPaymentRules.PaymentDecision.CANCELLED);
        assertThat(rules.decide(balance, "Y"))
                .isEqualTo(BillPaymentRules.PaymentDecision.EXECUTE);
    }
}
