package com.carddemo.backend.controller;

import com.carddemo.backend.dto.TransactionAddRequest;
import com.carddemo.backend.dto.TransactionAddResponse;
import com.carddemo.backend.dto.TransactionDetail;
import com.carddemo.backend.dto.TransactionListResponse;
import com.carddemo.backend.service.TransactionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Transaction List/View/Add (COTRN00C/COTRN01C/COTRN02C): BR-010/BR-015. */
@RestController
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/api/transactions")
    public TransactionListResponse list(@RequestParam(required = false) String startId,
                                         @RequestParam(defaultValue = "0") int page) {
        return transactionService.list(startId, page);
    }

    @GetMapping("/api/transactions/last")
    public TransactionDetail last(@RequestParam String cardNum) {
        return transactionService.getLast(cardNum);
    }

    @GetMapping("/api/transactions/{id}")
    public TransactionDetail getById(@PathVariable String id) {
        return transactionService.getById(id);
    }

    @PostMapping("/api/transactions")
    public TransactionAddResponse add(@RequestBody TransactionAddRequest request) {
        return transactionService.addTransaction(request);
    }
}
