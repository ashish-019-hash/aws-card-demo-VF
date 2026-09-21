package com.carddemo.backend.dto;

/**
 * Request for POST /api/reports (CORPT00, BR-013). {@code reportType} is one of
 * {@code MONTHLY}, {@code YEARLY}, {@code CUSTOM}; {@code startDate}/{@code endDate}
 * ({@code YYYY-MM-DD}) are required only for {@code CUSTOM} and are otherwise derived
 * server-side. {@code confirm} must be {@code "Y"} to submit the report job.
 */
public record ReportRequest(String reportType, String startDate, String endDate, String confirm) {
}
