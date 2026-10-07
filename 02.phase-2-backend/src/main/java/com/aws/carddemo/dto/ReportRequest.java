package com.aws.carddemo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ReportRequest(@NotNull ReportType type, LocalDate startDate, LocalDate endDate,
        @Size(max = 1) String confirmation) {
    public enum ReportType { MONTHLY, YEARLY, CUSTOM }
}
