package com.carddemo.backend.service;

import com.carddemo.backend.dto.ReportRequest;
import com.carddemo.backend.dto.ReportResponse;
import com.carddemo.backend.exception.ValidationFailedException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** BR-013 report period derivation + confirm-gate unit tests. */
class ReportServiceTest {

    private final ReportService service = new ReportService();

    @Test
    void monthlyReportDerivesCurrentMonthRange() {
        ReportResponse r = service.submit(new ReportRequest("Monthly", null, null, "Y"));
        LocalDate today = LocalDate.now();
        assertThat(r.periodStart()).isEqualTo(today.withDayOfMonth(1).toString());
        assertThat(r.periodEnd()).isEqualTo(today.withDayOfMonth(1).plusMonths(1).minusDays(1).toString());
        assertThat(r.submitted()).isTrue();
    }

    @Test
    void yearlyReportDerivesCurrentYearRange() {
        ReportResponse r = service.submit(new ReportRequest("Yearly", null, null, "Y"));
        int year = LocalDate.now().getYear();
        assertThat(r.periodStart()).isEqualTo(LocalDate.of(year, 1, 1).toString());
        assertThat(r.periodEnd()).isEqualTo(LocalDate.of(year, 12, 31).toString());
    }

    @Test
    void customReportUsesSuppliedDateRange() {
        ReportResponse r = service.submit(new ReportRequest("Custom", "2022-01-01", "2022-03-31", "Y"));
        assertThat(r.periodStart()).isEqualTo("2022-01-01");
        assertThat(r.periodEnd()).isEqualTo("2022-03-31");
        assertThat(r.submitted()).isTrue();
    }

    @Test
    void customReportRejectsMissingStartDate() {
        assertThatThrownBy(() -> service.submit(new ReportRequest("Custom", "", "2022-03-31", "Y")))
                .isInstanceOf(ValidationFailedException.class);
    }

    @Test
    void unknownReportTypeIsRejected() {
        assertThatThrownBy(() -> service.submit(new ReportRequest("Weekly", null, null, "Y")))
                .isInstanceOf(ValidationFailedException.class);
    }

    @Test
    void blankConfirmDoesNotSubmit() {
        ReportResponse r = service.submit(new ReportRequest("Monthly", null, null, ""));
        assertThat(r.submitted()).isFalse();
        assertThat(r.message()).contains("confirm");
    }

    @Test
    void confirmNDoesNotSubmitAndClearsMessage() {
        ReportResponse r = service.submit(new ReportRequest("Monthly", null, null, "N"));
        assertThat(r.submitted()).isFalse();
        assertThat(r.message()).isEmpty();
    }

    @Test
    void invalidConfirmValueIsRejected() {
        assertThatThrownBy(() -> service.submit(new ReportRequest("Monthly", null, null, "X")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anyMatch(fe -> fe.message().contains("not a valid value")));
    }
}
