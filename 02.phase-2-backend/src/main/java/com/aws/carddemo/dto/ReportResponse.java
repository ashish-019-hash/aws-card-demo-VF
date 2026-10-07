package com.aws.carddemo.dto;

import java.time.LocalDate;
import java.util.List;

public record ReportResponse(LocalDate startDate, LocalDate endDate, List<TransactionDto> transactions,
        String formatterStatus) { }
