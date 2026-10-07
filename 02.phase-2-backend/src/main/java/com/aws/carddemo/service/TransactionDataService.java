package com.aws.carddemo.service;

import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.entity.CardTransaction;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.CardTransactionRepository;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.repository.CreditCardRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.math.BigDecimal;
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
        return toDto(repository.save(t));
    }

    private void copy(TransactionRequest r, CardTransaction t) {
        t.setId(r.id()); t.setTransactionTypeCode(r.transactionTypeCode()); t.setTransactionCategoryCode(r.transactionCategoryCode());
        t.setSource(r.source()); t.setDescription(r.description()); t.setAmount(new BigDecimal(r.amount())); t.setMerchantId(Long.valueOf(r.merchantId()));
        t.setMerchantName(r.merchantName()); t.setMerchantCity(r.merchantCity()); t.setMerchantZip(r.merchantZip());
        String cardNumber = r.cardNumber();
        if ((cardNumber == null || cardNumber.isBlank()) && r.accountId() != null) {
            cardNumber = crossReferences.findByAccountId(r.accountId()).stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Card cross-reference for account", r.accountId()))
                    .getCardNumber();
        }
        if (!cards.existsById(cardNumber)) throw new ResourceNotFoundException("Credit card", cardNumber);
        t.setCardNumber(cardNumber); t.setOriginationTimestamp(r.originationTimestamp()); t.setProcessingTimestamp(r.processingTimestamp());
    }

    private CardTransaction entity(String id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transaction", id)); }
    private TransactionDto toDto(CardTransaction t) { return new TransactionDto(t.getId(), t.getTransactionTypeCode(), t.getTransactionCategoryCode(), t.getSource(), t.getDescription(), t.getAmount(), t.getMerchantId(), t.getMerchantName(), t.getMerchantCity(), t.getMerchantZip(), t.getCardNumber(), t.getOriginationTimestamp(), t.getProcessingTimestamp()); }
}
