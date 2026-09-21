package com.carddemo.backend.service;

import com.carddemo.backend.dto.ReportRequest;
import com.carddemo.backend.dto.ReportResponse;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.exception.ValidationFailedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Transaction Reports (CORPT00C): BR-013 — period derivation by report type, plus the
 * mandatory Y/N confirmation gate before a report job is (conceptually) submitted. This
 * modernized API submits a job-stub response only; it does not write to a JCL/batch
 * queue (CORPT00C's {@code SUBMIT-JOB-TO-INTRDR} target is out of scope for this REST
 * backend).
 */
@Service
public class ReportService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    public ReportResponse submit(ReportRequest request) {
        String type = request.reportType() == null ? "" : request.reportType().toUpperCase();
        LocalDate start;
        LocalDate end;

        switch (type) {
            case "MONTHLY" -> {
                LocalDate today = LocalDate.now();
                start = today.withDayOfMonth(1);
                end = start.plusMonths(1).minusDays(1);
            }
            case "YEARLY" -> {
                int year = LocalDate.now().getYear();
                start = LocalDate.of(year, 1, 1);
                end = LocalDate.of(year, 12, 31);
            }
            case "CUSTOM" -> {
                start = parseDate(request.startDate(), "startDate");
                end = parseDate(request.endDate(), "endDate");
            }
            default -> throw new ValidationFailedException(List.of(new FieldError("reportType", "VR-098",
                    "Select a report type to print report...")));
        }

        String confirm = request.confirm();
        if (confirm == null || confirm.isBlank()) {
            // VR-113: confirm required before job submission.
            return new ReportResponse(false, start.format(ISO), end.format(ISO),
                    "Please confirm to print the " + type.toLowerCase() + " report...");
        }
        if ("N".equalsIgnoreCase(confirm)) {
            return new ReportResponse(false, start.format(ISO), end.format(ISO), "");
        }
        if (!"Y".equalsIgnoreCase(confirm)) {
            // VR-114: any value other than Y/N is rejected.
            throw new ValidationFailedException(List.of(new FieldError("confirm", "VR-114",
                    "\"" + confirm + "\" is not a valid value to confirm...")));
        }
        return new ReportResponse(true, start.format(ISO), end.format(ISO), "Report job submitted.");
    }

    /** VR-111/VR-112 (custom report): must be a valid calendar date in YYYY-MM-DD format. */
    private LocalDate parseDate(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new ValidationFailedException(List.of(new FieldError(field, "VR-099",
                    field + " can NOT be empty...")));
        }
        try {
            return LocalDate.parse(value, ISO);
        } catch (DateTimeParseException e) {
            throw new ValidationFailedException(List.of(new FieldError(field, "VR-111",
                    field + " - Not a valid date...")));
        }
    }
}
