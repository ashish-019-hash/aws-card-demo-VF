package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.service.CardDemoApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    private final CardDemoApplicationService service;
    public AccountController(CardDemoApplicationService service) { this.service = service; }
    @GetMapping("/{accountId}") @Operation(summary = "View account with linked cards and customer")
    public ApiDtos.AccountResponse account(@PathVariable Long accountId) { return service.account(accountId); }
    @PutMapping("/{accountId}") @Operation(summary = "Update account and optionally its linked customer")
    public ApiDtos.UpdateResponse update(@PathVariable Long accountId, @RequestBody ApiDtos.AccountUpdateRequest request) { return service.updateAccount(accountId, request); }
    @org.springframework.web.bind.annotation.PostMapping("/{accountId}/payments") @Operation(summary = "Confirm a full-balance online bill payment")
    public ApiDtos.PaymentResponse pay(@PathVariable Long accountId, @RequestBody ApiDtos.PaymentRequest request) { return service.payBalance(accountId, request); }
}
