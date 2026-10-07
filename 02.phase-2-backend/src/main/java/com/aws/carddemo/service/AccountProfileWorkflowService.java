package com.aws.carddemo.service;

import com.aws.carddemo.dto.AccountProfileDto;
import com.aws.carddemo.dto.AccountProfileUpdateRequest;
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

    /**
     * Legacy COACTUPC rewrites ACCTDAT and CUSTDAT as one unit of work: both optimistic
     * versions are checked and either both records commit or neither does. The combined
     * screen only requires a change somewhere on the profile, not on each record.
     */
    @Transactional
    public AccountProfileDto update(Long accountId, AccountProfileUpdateRequest request) {
        validator.accountId(accountId, true);
        CardCrossReference reference = crossReferences.findByAccountId(accountId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Card cross-reference for account", accountId));
        boolean accountChanged = accounts.applyUpdate(accountId, request.account());
        boolean customerChanged = customers.applyUpdate(reference.getCustomerId(), request.customer());
        if (!accountChanged && !customerChanged) throw new IllegalArgumentException("At least one profile field must change");
        return new AccountProfileDto(accounts.find(accountId), customers.find(reference.getCustomerId()), cards.findByAccount(accountId));
    }
}
