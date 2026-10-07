package com.aws.carddemo.service;

import com.aws.carddemo.dto.CreditCardDto;
import com.aws.carddemo.dto.CreditCardRequest;
import com.aws.carddemo.entity.CreditCard;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.CreditCardRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CardDataService {
    private final CreditCardRepository repository;
    private final LegacyInputValidator validator;
    public CardDataService(CreditCardRepository repository, LegacyInputValidator validator) { this.repository = repository; this.validator = validator; }

    @Transactional(readOnly = true) public Page<CreditCardDto> findAll(Pageable pageable) { return repository.findAll(pageable).map(this::toDto); }
    @Transactional(readOnly = true) public List<CreditCardDto> findByAccount(Long accountId) { validator.accountId(accountId, true); return repository.findByAccountId(accountId).stream().map(this::toDto).toList(); }
    @Transactional(readOnly = true) public CreditCardDto find(String number) { validator.cardNumber(number, true); return toDto(entity(number)); }

    @Transactional
    public CreditCardDto update(String number, CreditCardRequest r) {
        validator.cardNumber(number, true); validator.card(r);
        CreditCard c = entity(number);
        if (!Objects.equals(c.getVersion(), r.version())) throw new com.aws.carddemo.exception.ResourceConflictException("Credit card changed after it was fetched");
        // Legacy COCRDUPC keys the card by account + card number; a card can never move to another account.
        if (!Objects.equals(c.getAccountId(), r.accountId())) throw new IllegalArgumentException("Card cannot be reassigned to a different account");
        boolean changed = !Objects.equals(c.getCvvCode(), r.cvvCode())
                || !Objects.equals(c.getEmbossedName(), r.embossedName()) || !Objects.equals(c.getExpirationDate(), r.expirationDate())
                || !Objects.equals(c.getActiveStatus(), r.activeStatus());
        if (!changed) throw new IllegalArgumentException("At least one card field must change");
        c.setCvvCode(r.cvvCode()); c.setEmbossedName(r.embossedName());
        c.setExpirationDate(r.expirationDate()); c.setActiveStatus(r.activeStatus());
        // Flush so the returned version reflects this update and supports consecutive edits.
        return toDto(repository.saveAndFlush(c));
    }

    private CreditCard entity(String number) { return repository.findById(number).orElseThrow(() -> new ResourceNotFoundException("Credit card", number)); }
    private CreditCardDto toDto(CreditCard c) { return new CreditCardDto(c.getCardNumber(), c.getVersion(), c.getAccountId(), c.getCvvCode(), c.getEmbossedName(), c.getExpirationDate(), c.getActiveStatus()); }
}
