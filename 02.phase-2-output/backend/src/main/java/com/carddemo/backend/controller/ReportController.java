package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ReportRequest;
import com.carddemo.backend.dto.ReportResponse;
import com.carddemo.backend.service.ReportService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Transaction Reports (CORPT00C): BR-013. */
@RestController
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/api/reports")
    public ReportResponse submit(@RequestBody ReportRequest request) {
        return reportService.submit(request);
    }
}
