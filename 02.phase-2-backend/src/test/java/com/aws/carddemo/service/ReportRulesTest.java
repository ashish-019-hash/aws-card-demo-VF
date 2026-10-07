package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.aws.carddemo.entity.CardTransaction;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReportRulesTest {
    private final ReportRules rules = new ReportRules();

    @Test
    void ruleCalc002DerivesCalendarPeriodsIncludingLeapYearMonthEnd() {
        ReportRules.ReportPeriod monthly = rules.determinePeriod(
                ReportRules.ReportType.MONTHLY, LocalDate.of(2024, 2, 10), null, null);
        ReportRules.ReportPeriod yearly = rules.determinePeriod(
                ReportRules.ReportType.YEARLY, LocalDate.of(2024, 7, 10), null, null);
        ReportRules.ReportPeriod custom = rules.determinePeriod(
                ReportRules.ReportType.CUSTOM,
                LocalDate.of(2024, 7, 10),
                LocalDate.of(2024, 3, 5),
                LocalDate.of(2024, 4, 6));

        assertThat(monthly).isEqualTo(new ReportRules.ReportPeriod(
                LocalDate.of(2024, 2, 1), LocalDate.of(2024, 2, 29)));
        assertThat(yearly).isEqualTo(new ReportRules.ReportPeriod(
                LocalDate.of(2024, 1, 1), LocalDate.of(2024, 12, 31)));
        assertThat(custom).isEqualTo(new ReportRules.ReportPeriod(
                LocalDate.of(2024, 3, 5), LocalDate.of(2024, 4, 6)));
    }

    @Test
    void ruleDecision004SelectsInclusiveProcessingDatesAndOrdersByCard() {
        CardTransaction secondCard = transaction("2", "2024-05-01-10.00.00.000000", "9000000000000000");
        CardTransaction firstCard = transaction("1", "2024-05-31-23.59.59.000000", "1000000000000000");
        CardTransaction excluded = transaction("3", "2024-06-01-00.00.00.000000", "0000000000000000");

        List<CardTransaction> result = rules.selectTransactions(
                List.of(secondCard, excluded, firstCard),
                new ReportRules.ReportPeriod(LocalDate.of(2024, 5, 1), LocalDate.of(2024, 5, 31)));

        assertThat(result).extracting(CardTransaction::getId).containsExactly("1", "2");
    }

    private CardTransaction transaction(String id, String processingTimestamp, String cardNumber) {
        CardTransaction transaction = new CardTransaction();
        transaction.setId(id);
        transaction.setProcessingTimestamp(processingTimestamp);
        transaction.setCardNumber(cardNumber);
        return transaction;
    }
}
