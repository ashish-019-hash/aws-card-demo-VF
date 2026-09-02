package com.carddemo.backend.domain;

import java.time.LocalDate;

/**
 * An inclusive start and end date for a transaction report.
 */
public record ReportPeriod(LocalDate startDate, LocalDate endDate) {
}
