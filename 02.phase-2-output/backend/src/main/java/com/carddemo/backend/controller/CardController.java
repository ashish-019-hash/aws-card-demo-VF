package com.carddemo.backend.controller;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.service.CardDemoApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cards")
public class CardController {
    private final CardDemoApplicationService service;
    public CardController(CardDemoApplicationService service) { this.service = service; }
    @GetMapping @Operation(summary = "Browse filtered credit cards")
    public Page<ApiDtos.CardSummary> list(@RequestParam(required = false) Long accountId, @RequestParam(required = false) String cardNumber, Pageable pageable) { return service.cards(accountId, cardNumber, pageable); }
    @GetMapping("/{cardNumber}") @Operation(summary = "View credit-card details")
    public ApiDtos.CardResponse detail(@PathVariable String cardNumber) { return service.cardDetail(cardNumber); }
    @PutMapping("/{cardNumber}") @Operation(summary = "Update credit-card maintained details")
    public ApiDtos.UpdateResponse update(@PathVariable String cardNumber, @RequestBody ApiDtos.CardUpdateRequest request) { return service.updateCard(cardNumber, request); }
}
