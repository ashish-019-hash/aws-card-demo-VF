package com.aws.carddemo.service;

import com.aws.carddemo.dto.BillPaymentRequest;
import com.aws.carddemo.dto.BillPaymentResponse;
import com.aws.carddemo.entity.Account;
import com.aws.carddemo.entity.CardCrossReference;
import com.aws.carddemo.entity.CardTransaction;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.AccountRepository;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.repository.CardTransactionRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillPaymentWorkflowService {
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd-HH.mm.ss.SSSSSS");
    private final AccountRepository accounts;
    private final CardCrossReferenceRepository crossReferences;
    private final CardTransactionRepository transactions;
    private final BillPaymentRules rules;
    private final LegacyInputValidator validator;
    public BillPaymentWorkflowService(AccountRepository accounts, CardCrossReferenceRepository crossReferences,
            CardTransactionRepository transactions, BillPaymentRules rules, LegacyInputValidator validator) {
        this.accounts = accounts; this.crossReferences = crossReferences; this.transactions = transactions;
        this.rules = rules; this.validator = validator;
    }

    @Transactional
    public BillPaymentResponse pay(BillPaymentRequest request) {
        validator.accountId(request.accountId(), true);
        validator.confirmation(request.confirmation());
        Account account = accounts.findById(request.accountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", request.accountId()));
        if (rules.decide(account.getCurrentBalance(), request.confirmation()) != BillPaymentRules.PaymentDecision.EXECUTE) {
            throw new IllegalArgumentException("The bill payment cannot execute");
        }
        CardCrossReference crossReference = crossReferences.findByAccountId(account.getId()).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Card cross-reference for account", account.getId()));
        BillPaymentRules.Settlement settlement = rules.settleFullBalance(account.getCurrentBalance(), crossReference.getCardNumber());
        String transactionId = nextTransactionId();
        CardTransaction transaction = new CardTransaction();
        transaction.setId(transactionId);
        transaction.setTransactionTypeCode(settlement.transactionType());
        transaction.setTransactionCategoryCode(settlement.transactionCategory());
        transaction.setSource(settlement.source());
        transaction.setDescription(settlement.description());
        transaction.setAmount(settlement.paymentAmount());
        transaction.setMerchantId(settlement.merchantId());
        transaction.setMerchantName(settlement.merchantName());
        transaction.setMerchantCity(" ");
        transaction.setMerchantZip(" ");
        transaction.setCardNumber(settlement.cardNumber());
        String timestamp = LocalDateTime.now().format(TIMESTAMP);
        transaction.setOriginationTimestamp(timestamp);
        transaction.setProcessingTimestamp(timestamp);
        try { transactions.saveAndFlush(transaction); }
        catch (org.springframework.dao.DataIntegrityViolationException exception) { throw new ResourceConflictException("Generated transaction ID already exists"); }
        account.setCurrentBalance(settlement.resultingBalance());
        accounts.save(account);
        return new BillPaymentResponse(account.getId(), settlement.cardNumber(), transactionId,
                settlement.paymentAmount(), settlement.resultingBalance());
    }

    private String nextTransactionId() {
        BigInteger last = transactions.findTopByOrderByIdDesc()
                .map(CardTransaction::getId).filter(id -> id.matches("[0-9]{16}"))
                .map(BigInteger::new).orElse(BigInteger.ZERO);
        return String.format("%016d", last.add(BigInteger.ONE));
    }
}
