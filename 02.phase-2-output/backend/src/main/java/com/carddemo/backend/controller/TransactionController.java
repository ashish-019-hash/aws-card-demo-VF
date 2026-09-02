package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.service.CardDemoApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final CardDemoApplicationService service;
    public TransactionController(CardDemoApplicationService service) { this.service = service; }
    @GetMapping @Operation(summary = "Browse transactions from an optional transaction ID")
    public Page<ApiDtos.TransactionResponse> list(@RequestParam(required = false) String fromTransactionId, Pageable pageable) { return service.transactions(fromTransactionId, pageable); }
    @GetMapping("/{transactionId}") @Operation(summary = "View transaction details")
    public ApiDtos.TransactionResponse detail(@PathVariable String transactionId) { return service.transaction(transactionId); }
    @PostMapping @Operation(summary = "Add a confirmed transaction")
    public ApiDtos.TransactionCreateResponse add(@RequestBody ApiDtos.TransactionCreateRequest request) { return service.addTransaction(request); }
}
