package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class MenuController {
    @GetMapping("/menu")
    @Operation(summary = "List standard-user capabilities")
    public ApiDtos.MenuResponse menu() {
        return new ApiDtos.MenuResponse("MAIN", List.of(
                new ApiDtos.MenuOption(1, "/api/accounts/{accountId}"), new ApiDtos.MenuOption(2, "/api/accounts/{accountId}"),
                new ApiDtos.MenuOption(3, "/api/cards"), new ApiDtos.MenuOption(4, "/api/cards/{cardNumber}"),
                new ApiDtos.MenuOption(5, "/api/cards/{cardNumber}"), new ApiDtos.MenuOption(6, "/api/transactions"),
                new ApiDtos.MenuOption(7, "/api/transactions/{transactionId}"), new ApiDtos.MenuOption(8, "/api/transactions"),
                new ApiDtos.MenuOption(9, "/api/reports/requests"), new ApiDtos.MenuOption(10, "/api/accounts/{accountId}/payments")));
    }
    @GetMapping("/admin/menu")
    @Operation(summary = "List security-administration capabilities")
    public ApiDtos.MenuResponse adminMenu() {
        return new ApiDtos.MenuResponse("ADMINISTRATION", List.of(
                new ApiDtos.MenuOption(1, "/api/users"), new ApiDtos.MenuOption(2, "/api/users"),
                new ApiDtos.MenuOption(3, "/api/users/{userId}"), new ApiDtos.MenuOption(4, "/api/users/{userId}")));
    }
}
