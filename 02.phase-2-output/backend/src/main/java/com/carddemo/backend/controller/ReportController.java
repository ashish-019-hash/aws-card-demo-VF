package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.service.CardDemoApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final CardDemoApplicationService service;
    public ReportController(CardDemoApplicationService service) { this.service = service; }
    @PostMapping("/requests") @Operation(summary = "Confirm and submit a monthly, yearly, or custom report request")
    public ApiDtos.ReportResponse request(@RequestBody ApiDtos.ReportRequest request) { return service.requestReport(request); }
    @GetMapping("/requests/{requestId}") @Operation(summary = "Retrieve submitted report state and card-sorted output")
    public ApiDtos.ReportResponse output(@PathVariable Long requestId) { return service.report(requestId); }
    @GetMapping("/transactions") @Operation(summary = "Produce card-sorted report details for an inclusive period")
    public ApiDtos.ReportResponse adHocOutput(@RequestParam LocalDate startDate, @RequestParam LocalDate endDate) { return service.report(startDate, endDate); }
}
