package com.aws.carddemo.controller;

import com.aws.carddemo.dto.AccountProfileDto;
import com.aws.carddemo.dto.AccountProfileUpdateRequest;
import com.aws.carddemo.service.AccountProfileWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/account-profiles") @Tag(name = "Account profiles")
public class AccountProfileController {
    private final AccountProfileWorkflowService service;
    public AccountProfileController(AccountProfileWorkflowService service) { this.service = service; }
    @GetMapping("/{accountId}") @Operation(summary = "Get an account profile") public AccountProfileDto get(@PathVariable Long accountId) { return service.find(accountId); }
    @PutMapping("/{accountId}") @Operation(summary = "Update account and customer atomically") public AccountProfileDto update(@PathVariable Long accountId, @Valid @RequestBody AccountProfileUpdateRequest request) { return service.update(accountId, request); }
}
