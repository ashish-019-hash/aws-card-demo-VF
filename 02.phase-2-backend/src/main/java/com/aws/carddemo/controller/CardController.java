package com.aws.carddemo.controller;

import com.aws.carddemo.dto.CreditCardDto;
import com.aws.carddemo.dto.CreditCardRequest;
import com.aws.carddemo.service.CardDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/cards") @Tag(name = "Credit cards")
public class CardController {
    private final CardDataService service;
    public CardController(CardDataService service) { this.service = service; }
    @GetMapping @Operation(summary = "List cards") public Page<CreditCardDto> list(Pageable pageable) { return service.findAll(pageable); }
    @GetMapping(params = "accountId") @Operation(summary = "List cards for an account") public List<CreditCardDto> byAccount(@RequestParam Long accountId) { return service.findByAccount(accountId); }
    @GetMapping("/{number}") @Operation(summary = "Get a card") public CreditCardDto get(@PathVariable String number) { return service.find(number); }
    @PutMapping("/{number}") @Operation(summary = "Update a card") public CreditCardDto update(@PathVariable String number, @Valid @RequestBody CreditCardRequest request) { return service.update(number, request); }
}
