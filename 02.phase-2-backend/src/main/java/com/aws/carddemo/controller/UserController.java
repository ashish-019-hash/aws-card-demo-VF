package com.aws.carddemo.controller;

import com.aws.carddemo.dto.UserDto;
import com.aws.carddemo.dto.UserRequest;
import com.aws.carddemo.service.UserDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/users") @Tag(name = "Users")
public class UserController {
    private final UserDataService service;
    public UserController(UserDataService service) { this.service = service; }
    @GetMapping @Operation(summary = "List users") public Page<UserDto> list(Pageable pageable) { return service.findAll(pageable); }
    @GetMapping("/{id}") @Operation(summary = "Get a user") public UserDto get(@PathVariable String id) { return service.find(id); }
    @PostMapping("/{id}") @Operation(summary = "Create a user") public ResponseEntity<UserDto> create(@PathVariable String id, @Valid @RequestBody UserRequest request) {
        UserDto created = service.create(id, request); return ResponseEntity.created(URI.create("/api/users/" + created.id())).body(created);
    }
    @PutMapping("/{id}") @Operation(summary = "Update a user") public UserDto update(@PathVariable String id, @Valid @RequestBody UserRequest request) { return service.update(id, request); }
    @DeleteMapping("/{id}") @Operation(summary = "Delete a user") public ResponseEntity<Void> delete(@PathVariable String id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
