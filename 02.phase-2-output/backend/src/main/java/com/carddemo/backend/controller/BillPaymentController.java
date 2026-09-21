package com.carddemo.backend.controller;

import com.carddemo.backend.dto.BillPaymentRequest;
import com.carddemo.backend.dto.BillPaymentResponse;
import com.carddemo.backend.service.BillPaymentService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Bill Payment (COBIL00C): BR-011/BR-012. */
@RestController
public class BillPaymentController {

    private final BillPaymentService billPaymentService;

    public BillPaymentController(BillPaymentService billPaymentService) {
        this.billPaymentService = billPaymentService;
    }

    @PostMapping("/api/bill-payments")
    public BillPaymentResponse pay(@RequestBody BillPaymentRequest request) {
        return billPaymentService.pay(request);
    }
}
