package com.carddemo.backend.service;

import com.carddemo.backend.domain.ReportPeriod;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ReportingPeriodRulesServiceTest {

    private final ReportingPeriodRulesService reportingPeriodRulesService = new ReportingPeriodRulesService();

    @Test
    void returnsTheInclusiveCurrentMonthPeriod() {
        ReportPeriod reportPeriod = reportingPeriodRulesService.currentMonth(LocalDate.of(2026, 4, 15));

        assertThat(reportPeriod.startDate()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(reportPeriod.endDate()).isEqualTo(LocalDate.of(2026, 4, 30));
    }

    @Test
    void handlesTheDecemberToJanuaryRolloverWhenDerivingMonthEnd() {
        ReportPeriod reportPeriod = reportingPeriodRulesService.currentMonth(LocalDate.of(2026, 12, 31));

        assertThat(reportPeriod.startDate()).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(reportPeriod.endDate()).isEqualTo(LocalDate.of(2026, 12, 31));
    }

    @Test
    void handlesTheJanuaryBoundary() {
        ReportPeriod reportPeriod = reportingPeriodRulesService.currentMonth(LocalDate.of(2027, 1, 1));

        assertThat(reportPeriod.startDate()).isEqualTo(LocalDate.of(2027, 1, 1));
        assertThat(reportPeriod.endDate()).isEqualTo(LocalDate.of(2027, 1, 31));
    }

    @Test
    void usesTheCurrentCalendarYearRegardlessOfTheCurrentDay() {
        ReportPeriod reportPeriod = reportingPeriodRulesService.currentYear(LocalDate.of(2028, 2, 29));

        assertThat(reportPeriod.startDate()).isEqualTo(LocalDate.of(2028, 1, 1));
        assertThat(reportPeriod.endDate()).isEqualTo(LocalDate.of(2028, 12, 31));
    }
}
