package com.aws.carddemo.controller;

import com.aws.carddemo.dto.AccountDto;
import com.aws.carddemo.dto.AccountRequest;
import com.aws.carddemo.service.AccountDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/accounts") @Tag(name = "Accounts")
public class AccountController {
    private final AccountDataService service;
    public AccountController(AccountDataService service) { this.service = service; }
    @GetMapping @Operation(summary = "List accounts") public Page<AccountDto> list(Pageable pageable) { return service.findAll(pageable); }
    @GetMapping("/{id}") @Operation(summary = "Get an account") public AccountDto get(@PathVariable Long id) { return service.find(id); }
    @PutMapping("/{id}") @Operation(summary = "Update an account") public AccountDto update(@PathVariable Long id, @Valid @RequestBody AccountRequest request) { return service.update(id, request); }
}
