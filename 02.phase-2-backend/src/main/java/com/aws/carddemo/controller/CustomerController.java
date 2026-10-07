package com.aws.carddemo.controller;

import com.aws.carddemo.dto.CustomerDto;
import com.aws.carddemo.dto.CustomerRequest;
import com.aws.carddemo.service.CustomerDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/customers") @Tag(name = "Customers")
public class CustomerController {
    private final CustomerDataService service;
    public CustomerController(CustomerDataService service) { this.service = service; }
    @GetMapping @Operation(summary = "List customers") public Page<CustomerDto> list(Pageable pageable) { return service.findAll(pageable); }
    @GetMapping("/{id}") @Operation(summary = "Get a customer") public CustomerDto get(@PathVariable Long id) { return service.find(id); }
    @PutMapping("/{id}") @Operation(summary = "Update a customer") public CustomerDto update(@PathVariable Long id, @Valid @RequestBody CustomerRequest request) { return service.update(id, request); }
}
