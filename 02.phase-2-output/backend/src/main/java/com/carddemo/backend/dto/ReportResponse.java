package com.carddemo.backend.dto;

public record ReportResponse(boolean submitted, String periodStart, String periodEnd, String message) {
}
