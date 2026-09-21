package com.carddemo.backend.controller;

import com.carddemo.backend.dto.CardDetail;
import com.carddemo.backend.dto.CardListResponse;
import com.carddemo.backend.dto.CardUpdateRequest;
import com.carddemo.backend.dto.CardUpdateResponse;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.exception.ValidationFailedException;
import com.carddemo.backend.service.CardService;
import com.carddemo.backend.validation.CardValidationService;
import com.carddemo.backend.validation.CommonValidators;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/** Card List/View/Update (COCRDLIC/COCRDSLC/COCRDUPC): BR-009/BR-014/BR-015. */
@RestController
public class CardController {

    private final CardService cardService;
    private final CardValidationService cardValidationService;

    public CardController(CardService cardService, CardValidationService cardValidationService) {
        this.cardService = cardService;
        this.cardValidationService = cardValidationService;
    }

    @GetMapping("/api/cards")
    public CardListResponse search(@RequestParam(required = false) Long acctId,
                                    @RequestParam(required = false) String cardNum,
                                    @RequestParam(defaultValue = "0") int page) {
        List<FieldError> errors = new ArrayList<>();
        CommonValidators.numericFilterOptional(errors, "cardNum", "VR-055", cardNum, 16,
                "CARD ID FILTER,IF SUPPLIED MUST BE A 16 DIGIT NUMBER");
        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
        return cardService.search(acctId, cardNum, page);
    }

    @GetMapping("/api/cards/{cardNumber}")
    public CardDetail getCard(@PathVariable String cardNumber) {
        return cardService.getCard(cardNumber);
    }

    @PutMapping("/api/cards/{cardNumber}")
    public CardUpdateResponse updateCard(@PathVariable String cardNumber, @RequestBody CardUpdateRequest request) {
        cardValidationService.validate(request.updated());
        return cardService.updateCard(cardNumber, request);
    }
}
