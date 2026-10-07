package com.aws.carddemo.service;

import com.aws.carddemo.dto.AccountProfileDto;
import com.aws.carddemo.entity.CardCrossReference;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountProfileWorkflowService {
    private final CardCrossReferenceRepository crossReferences;
    private final AccountDataService accounts;
    private final CustomerDataService customers;
    private final CardDataService cards;
    private final LegacyInputValidator validator;
    public AccountProfileWorkflowService(CardCrossReferenceRepository crossReferences, AccountDataService accounts,
            CustomerDataService customers, CardDataService cards, LegacyInputValidator validator) {
        this.crossReferences = crossReferences; this.accounts = accounts; this.customers = customers; this.cards = cards; this.validator = validator;
    }

    @Transactional(readOnly = true)
    public AccountProfileDto find(Long accountId) {
        validator.accountId(accountId, true);
        CardCrossReference reference = crossReferences.findByAccountId(accountId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Card cross-reference for account", accountId));
        return new AccountProfileDto(accounts.find(accountId), customers.find(reference.getCustomerId()), cards.findByAccount(accountId));
    }
}
