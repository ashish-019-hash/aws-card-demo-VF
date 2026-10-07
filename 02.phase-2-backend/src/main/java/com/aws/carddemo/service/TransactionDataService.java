package com.aws.carddemo.service;

import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.entity.CardCrossReference;
import com.aws.carddemo.entity.CardTransaction;
import com.aws.carddemo.entity.TransactionCategoryId;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.CardTransactionRepository;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.repository.CreditCardRepository;
import com.aws.carddemo.repository.TransactionCategoryRepository;
import com.aws.carddemo.repository.TransactionTypeRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.List;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionDataService {
    private final CardTransactionRepository repository;
    private final CardCrossReferenceRepository crossReferences;
    private final CreditCardRepository cards;
    private final TransactionTypeRepository transactionTypes;
    private final TransactionCategoryRepository transactionCategories;
    private final LegacyInputValidator validator;
    @PersistenceContext private EntityManager entityManager;
    public TransactionDataService(CardTransactionRepository repository, CardCrossReferenceRepository crossReferences,
            CreditCardRepository cards, TransactionTypeRepository transactionTypes,
            TransactionCategoryRepository transactionCategories, LegacyInputValidator validator) {
        this.repository = repository; this.crossReferences = crossReferences; this.cards = cards;
        this.transactionTypes = transactionTypes; this.transactionCategories = transactionCategories; this.validator = validator;
    }

    @Transactional(readOnly = true) public Page<TransactionDto> findAll(Pageable pageable) { return repository.findAll(pageable).map(this::toDto); }
    @Transactional(readOnly = true) public TransactionDto find(String id) { validator.transactionId(id, true); return toDto(entity(id)); }

    @Transactional
    public TransactionDto create(TransactionRequest r) {
        validator.transaction(r);
        if (repository.existsById(r.id())) throw new ResourceConflictException("Transaction already exists: " + r.id());
        requireTypeAndCategory(r.transactionTypeCode(), r.transactionCategoryCode());
        CardTransaction t = new CardTransaction();
        copy(r, t);
        // Insert-only: persist never overwrites an existing row, and a concurrent insert
        // of the same ID between the check above and the flush surfaces as a conflict.
        try { entityManager.persist(t); entityManager.flush(); }
        catch (PersistenceException | org.springframework.dao.DataIntegrityViolationException exception) {
            // All foreign keys (type, category, card) were verified above, so the only
            // integrity failure mapped to a conflict is a real primary-key collision.
            if (isDuplicateKeyViolation(exception)) throw new ResourceConflictException("Transaction already exists: " + r.id());
            throw exception;
        }
        return toDto(t);
    }

    /**
     * The relational schema keys card_transactions to transaction_types and
     * transaction_categories (legacy TRANTYPE/TRANCATG reference data). Verify both
     * up front so an unknown code surfaces as a clear not-found error instead of a
     * flush-time integrity failure misreported as a duplicate transaction ID.
     */
    private void requireTypeAndCategory(String typeCode, Integer categoryCode) {
        if (!transactionTypes.existsById(typeCode)) throw new ResourceNotFoundException("Transaction type", typeCode);
        TransactionCategoryId categoryId = new TransactionCategoryId();
        categoryId.setTransactionTypeCode(typeCode);
        categoryId.setTransactionCategoryCode(categoryCode);
        if (!transactionCategories.existsById(categoryId))
            throw new ResourceNotFoundException("Transaction category", typeCode + "/" + categoryCode);
    }

    /** True only for unique/primary-key violations (SQLSTATE 23505), never FK or other integrity failures. */
    private boolean isDuplicateKeyViolation(RuntimeException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation)
                return violation.getKind() == ConstraintViolationException.ConstraintKind.UNIQUE;
            if (cause instanceof SQLException sql) return "23505".equals(sql.getSQLState());
        }
        return false;
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
     * When it is supplied, READ-CXACAIX-FILE resolves the account's cross-reference and
     * MOVE XREF-CARD-NUM TO CARDNINI overwrites whatever card number was typed, so any
     * supplied card number is ignored. A card number alone must itself exist in CCXREF.
     */
    private String resolveCardNumber(Long accountId, String cardNumber) {
        if (accountId != null) {
            List<CardCrossReference> references = crossReferences.findByAccountId(accountId);
            if (references.isEmpty()) throw new ResourceNotFoundException("Card cross-reference for account", accountId);
            return references.get(0).getCardNumber();
        }
        return crossReferences.findById(cardNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Card cross-reference for card", cardNumber))
                .getCardNumber();
    }

    private CardTransaction entity(String id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transaction", id)); }
    private TransactionDto toDto(CardTransaction t) { return new TransactionDto(t.getId(), t.getTransactionTypeCode(), t.getTransactionCategoryCode(), t.getSource(), t.getDescription(), t.getAmount(), t.getMerchantId(), t.getMerchantName(), t.getMerchantCity(), t.getMerchantZip(), t.getCardNumber(), t.getOriginationTimestamp(), t.getProcessingTimestamp()); }
}
