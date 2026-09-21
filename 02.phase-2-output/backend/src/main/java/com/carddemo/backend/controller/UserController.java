package com.carddemo.backend.controller;

import com.carddemo.backend.dto.UserListResponse;
import com.carddemo.backend.dto.UserRequest;
import com.carddemo.backend.dto.UserResponse;
import com.carddemo.backend.service.UserAdminService;
import com.carddemo.backend.validation.UserValidationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * User Administration (COUSR00C-COUSR03C): admin-only (enforced by
 * SecurityConfiguration's {@code /api/users/**} rule -&gt; 403 for regular users).
 * BR-015/BR-016.
 */
@RestController
public class UserController {

    private final UserAdminService userAdminService;
    private final UserValidationService userValidationService;

    public UserController(UserAdminService userAdminService, UserValidationService userValidationService) {
        this.userAdminService = userAdminService;
        this.userValidationService = userValidationService;
    }

    @GetMapping("/api/users")
    public UserListResponse list(@RequestParam(defaultValue = "0") int page) {
        return userAdminService.list(page);
    }

    @GetMapping("/api/users/{userId}")
    public UserResponse get(@PathVariable String userId) {
        return userAdminService.get(userId);
    }

    @PostMapping("/api/users")
    public ResponseEntity<UserResponse> create(@RequestBody UserRequest request) {
        userValidationService.validateForCreate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userAdminService.create(request));
    }

    @PutMapping("/api/users/{userId}")
    public UserResponse update(@PathVariable String userId, @RequestBody UserRequest request) {
        userValidationService.validateForUpdate(request);
        return userAdminService.update(userId, request);
    }

    @DeleteMapping("/api/users/{userId}")
    public ResponseEntity<Void> delete(@PathVariable String userId) {
        userAdminService.delete(userId);
        return ResponseEntity.noContent().build();
    }
}
