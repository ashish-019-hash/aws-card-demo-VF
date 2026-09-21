package com.carddemo.backend.controller;

import com.carddemo.backend.dto.AccountUpdateRequest;
import com.carddemo.backend.dto.AccountUpdateResponse;
import com.carddemo.backend.dto.AccountView;
import com.carddemo.backend.service.AccountService;
import com.carddemo.backend.validation.AccountValidationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Account View/Update (COACTVWC/COACTUPC): BR-005/BR-006/BR-007/BR-008. */
@RestController
public class AccountController {

    private final AccountService accountService;
    private final AccountValidationService accountValidationService;

    public AccountController(AccountService accountService, AccountValidationService accountValidationService) {
        this.accountService = accountService;
        this.accountValidationService = accountValidationService;
    }

    @GetMapping("/api/accounts/{id}")
    public AccountView getAccount(@PathVariable Long id) {
        return accountService.getAccountView(id);
    }

    @PutMapping("/api/accounts/{id}")
    public AccountUpdateResponse updateAccount(@PathVariable Long id, @RequestBody AccountUpdateRequest request) {
        accountValidationService.validate(request.updated());
        return accountService.updateAccount(id, request);
    }
}
