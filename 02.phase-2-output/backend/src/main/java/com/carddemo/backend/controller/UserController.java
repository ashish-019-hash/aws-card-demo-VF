package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.service.CardDemoApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final CardDemoApplicationService service;
    public UserController(CardDemoApplicationService service) { this.service = service; }
    @GetMapping @Operation(summary = "Browse security users")
    public Page<ApiDtos.UserResponse> list(@RequestParam(required = false) String startsWith, Pageable pageable) { return service.users(startsWith, pageable); }
    @GetMapping("/{userId}") @Operation(summary = "Retrieve security user for maintenance")
    public ApiDtos.UserResponse get(@PathVariable String userId) { return service.user(userId); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @Operation(summary = "Add a security user")
    public ApiDtos.UserResponse add(@RequestBody ApiDtos.UserCreateRequest request) { return service.addUser(request); }
    @PutMapping("/{userId}") @Operation(summary = "Update a changed security user")
    public ApiDtos.UpdateResponse update(@PathVariable String userId, @RequestBody ApiDtos.UserUpdateRequest request) { return service.updateUser(userId, request); }
    @DeleteMapping("/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT) @Operation(summary = "Delete a selected security user")
    public void delete(@PathVariable String userId) { service.deleteUser(userId); }
}
