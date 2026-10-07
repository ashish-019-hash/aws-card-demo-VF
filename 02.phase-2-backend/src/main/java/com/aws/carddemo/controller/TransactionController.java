package com.aws.carddemo.controller;

import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.service.TransactionDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/transactions") @Tag(name = "Transactions")
public class TransactionController {
    private final TransactionDataService service;
    public TransactionController(TransactionDataService service) { this.service = service; }
    @GetMapping @Operation(summary = "List transactions") public Page<TransactionDto> list(Pageable pageable) { return service.findAll(pageable); }
    @GetMapping("/{id}") @Operation(summary = "Get a transaction") public TransactionDto get(@PathVariable String id) { return service.find(id); }
    @PostMapping @Operation(summary = "Create a transaction") public ResponseEntity<TransactionDto> create(@Valid @RequestBody TransactionRequest request) {
        TransactionDto created = service.create(request);
        return ResponseEntity.created(URI.create("/api/transactions/" + created.id())).body(created);
    }
}
