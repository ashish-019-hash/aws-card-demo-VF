package com.carddemo.backend.service;

import com.carddemo.backend.domain.ReportPeriod;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Implements RULE-DECISION-003 and RULE-DECISION-004 from the business rules catalog.
 */
@Service
public class ReportingPeriodRulesService {

    public ReportPeriod currentMonth(LocalDate currentDate) {
        LocalDate startDate = currentDate.withDayOfMonth(1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        return new ReportPeriod(startDate, endDate);
    }

    public ReportPeriod currentYear(LocalDate currentDate) {
        return new ReportPeriod(
                currentDate.withDayOfYear(1),
                currentDate.withMonth(12).withDayOfMonth(31));
    }
}
