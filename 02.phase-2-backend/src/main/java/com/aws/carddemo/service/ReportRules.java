package com.aws.carddemo.service;

import com.aws.carddemo.entity.CardTransaction;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ReportRules {
    public ReportPeriod determinePeriod(
            ReportType reportType,
            LocalDate currentDate,
            LocalDate customStart,
            LocalDate customEnd) {
        return switch (reportType) {
            case MONTHLY -> new ReportPeriod(
                    currentDate.withDayOfMonth(1),
                    currentDate.withDayOfMonth(1).plusMonths(1).minusDays(1));
            case YEARLY -> new ReportPeriod(
                    LocalDate.of(currentDate.getYear(), 1, 1),
                    LocalDate.of(currentDate.getYear(), 12, 31));
            case CUSTOM -> new ReportPeriod(customStart, customEnd);
        };
    }

    public List<CardTransaction> selectTransactions(
            List<CardTransaction> transactions,
            ReportPeriod period) {
        return transactions.stream()
                .filter(transaction -> isWithinProcessingPeriod(transaction, period))
                .sorted(Comparator.comparing(CardTransaction::getCardNumber))
                .toList();
    }

    private boolean isWithinProcessingPeriod(CardTransaction transaction, ReportPeriod period) {
        String processingTimestamp = transaction.getProcessingTimestamp();
        if (processingTimestamp == null || processingTimestamp.length() < 10) {
            return false;
        }
        LocalDate processingDate = LocalDate.parse(processingTimestamp.substring(0, 10));
        return !processingDate.isBefore(period.startDate()) && !processingDate.isAfter(period.endDate());
    }

    public enum ReportType {
        MONTHLY,
        YEARLY,
        CUSTOM
    }

    public record ReportPeriod(LocalDate startDate, LocalDate endDate) {
        public ReportPeriod {
            if (startDate == null || endDate == null) {
                throw new IllegalArgumentException("Report dates are required");
            }
            if (startDate.isAfter(endDate)) {
                throw new IllegalArgumentException("Report start date must not follow end date");
            }
        }
    }
}
