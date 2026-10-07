package com.aws.carddemo.controller;

import com.aws.carddemo.dto.ReportRequest;
import com.aws.carddemo.dto.ReportResponse;
import com.aws.carddemo.service.ReportWorkflowService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/reports/transactions")
public class ReportController {
    private final ReportWorkflowService service;
    public ReportController(ReportWorkflowService service) { this.service = service; }
    @PostMapping public ReportResponse report(@Valid @RequestBody ReportRequest request) { return service.generate(request); }
}
