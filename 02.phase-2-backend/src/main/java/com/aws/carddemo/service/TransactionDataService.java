package com.aws.carddemo.service;

import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.entity.CardCrossReference;
import com.aws.carddemo.entity.CardTransaction;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.CardTransactionRepository;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.repository.CreditCardRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionDataService {
    private final CardTransactionRepository repository;
    private final CardCrossReferenceRepository crossReferences;
    private final CreditCardRepository cards;
    private final LegacyInputValidator validator;
    @PersistenceContext private EntityManager entityManager;
    public TransactionDataService(CardTransactionRepository repository, CardCrossReferenceRepository crossReferences,
            CreditCardRepository cards, LegacyInputValidator validator) {
        this.repository = repository; this.crossReferences = crossReferences; this.cards = cards; this.validator = validator;
    }

    @Transactional(readOnly = true) public Page<TransactionDto> findAll(Pageable pageable) { return repository.findAll(pageable).map(this::toDto); }
    @Transactional(readOnly = true) public TransactionDto find(String id) { validator.transactionId(id, true); return toDto(entity(id)); }

    @Transactional
    public TransactionDto create(TransactionRequest r) {
        validator.transaction(r);
        if (repository.existsById(r.id())) throw new ResourceConflictException("Transaction already exists: " + r.id());
        CardTransaction t = new CardTransaction();
        copy(r, t);
        // Insert-only: persist never overwrites an existing row, and a concurrent insert
        // of the same ID between the check above and the flush surfaces as a conflict.
        try { entityManager.persist(t); entityManager.flush(); }
        catch (PersistenceException | org.springframework.dao.DataIntegrityViolationException exception) {
            throw new ResourceConflictException("Transaction already exists: " + r.id());
        }
        return toDto(t);
    }

    private void copy(TransactionRequest r, CardTransaction t) {
        t.setId(r.id()); t.setTransactionTypeCode(r.transactionTypeCode()); t.setTransactionCategoryCode(r.transactionCategoryCode());
        t.setSource(r.source()); t.setDescription(r.description()); t.setAmount(new BigDecimal(r.amount())); t.setMerchantId(Long.valueOf(r.merchantId()));
        t.setMerchantName(r.merchantName()); t.setMerchantCity(r.merchantCity()); t.setMerchantZip(r.merchantZip());
        String cardNumber = resolveCardNumber(r.accountId(), r.cardNumber());
        if (!cards.existsById(cardNumber)) throw new ResourceNotFoundException("Credit card", cardNumber);
        t.setCardNumber(cardNumber); t.setOriginationTimestamp(r.originationTimestamp()); t.setProcessingTimestamp(r.processingTimestamp());
    }

    /**
     * RULE-VAL-056 (COTRN02C VALIDATE-INPUT-KEY-FIELDS): the account ID takes precedence.
     * When it is supplied it must resolve through the card cross-reference, which provides
     * the card number; a card number supplied alongside it must belong to that account.
     * A card number alone must itself exist in the cross-reference.
     */
    private String resolveCardNumber(Long accountId, String cardNumber) {
        if (accountId != null) {
            List<CardCrossReference> references = crossReferences.findByAccountId(accountId);
            if (references.isEmpty()) throw new ResourceNotFoundException("Card cross-reference for account", accountId);
            if (cardNumber == null || cardNumber.isBlank()) return references.get(0).getCardNumber();
            String supplied = cardNumber;
            if (references.stream().noneMatch(reference -> reference.getCardNumber().equals(supplied)))
                throw new IllegalArgumentException("Card Number does not belong to the entered Account ID");
            return supplied;
        }
        return crossReferences.findById(cardNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Card cross-reference for card", cardNumber))
                .getCardNumber();
    }

    private CardTransaction entity(String id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transaction", id)); }
    private TransactionDto toDto(CardTransaction t) { return new TransactionDto(t.getId(), t.getTransactionTypeCode(), t.getTransactionCategoryCode(), t.getSource(), t.getDescription(), t.getAmount(), t.getMerchantId(), t.getMerchantName(), t.getMerchantCity(), t.getMerchantZip(), t.getCardNumber(), t.getOriginationTimestamp(), t.getProcessingTimestamp()); }
}
