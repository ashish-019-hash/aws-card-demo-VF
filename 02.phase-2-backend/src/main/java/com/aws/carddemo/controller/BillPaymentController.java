package com.aws.carddemo.controller;

import com.aws.carddemo.dto.BillPaymentRequest;
import com.aws.carddemo.dto.BillPaymentResponse;
import com.aws.carddemo.service.BillPaymentWorkflowService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/bill-payments")
public class BillPaymentController {
    private final BillPaymentWorkflowService service;
    public BillPaymentController(BillPaymentWorkflowService service) { this.service = service; }
    @PostMapping public BillPaymentResponse pay(@Valid @RequestBody BillPaymentRequest request) { return service.pay(request); }
}
