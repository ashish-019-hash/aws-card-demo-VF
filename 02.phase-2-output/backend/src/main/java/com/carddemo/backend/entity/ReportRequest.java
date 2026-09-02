package com.carddemo.backend.entity;

import com.carddemo.backend.dto.ApiDtos;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "REPORT_REQUEST")
public class ReportRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "REPORT_REQUEST_ID", nullable = false)
    private Long reportRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "REPORT_TYPE", nullable = false, length = 10)
    private ApiDtos.ReportType type;

    @Column(name = "START_DATE", nullable = false)
    private LocalDate startDate;

    @Column(name = "END_DATE", nullable = false)
    private LocalDate endDate;

    @Column(name = "STATUS", nullable = false, length = 12)
    private String status;

    @Column(name = "SUBMITTED_AT", nullable = false)
    private LocalDateTime submittedAt;

    public ReportRequest() { }

    public ReportRequest(Long reportRequestId, ApiDtos.ReportType type, LocalDate startDate, LocalDate endDate,
                         String status, LocalDateTime submittedAt) {
        this.reportRequestId = reportRequestId;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.submittedAt = submittedAt;
    }

    public Long getReportRequestId() { return reportRequestId; }
    public ApiDtos.ReportType getType() { return type; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getStatus() { return status; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
}
