package com.aws.carddemo.controller;

import com.aws.carddemo.dto.AccountProfileDto;
import com.aws.carddemo.service.AccountProfileWorkflowService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/account-profiles")
public class AccountProfileController {
    private final AccountProfileWorkflowService service;
    public AccountProfileController(AccountProfileWorkflowService service) { this.service = service; }
    @GetMapping("/{accountId}") public AccountProfileDto get(@PathVariable Long accountId) { return service.find(accountId); }
}
