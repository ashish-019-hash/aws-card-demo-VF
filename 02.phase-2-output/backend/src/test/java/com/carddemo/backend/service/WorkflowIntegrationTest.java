package com.carddemo.backend.service;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.entity.CardAccountAssignment;
import com.carddemo.backend.entity.CreditCardTransaction;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.entity.TransactionCategory;
import com.carddemo.backend.entity.TransactionCategoryId;
import com.carddemo.backend.entity.TransactionType;
import com.carddemo.backend.exception.ApiException;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardAccountAssignmentRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CreditCardTransactionRepository;
import com.carddemo.backend.repository.CustomerRepository;
import com.carddemo.backend.repository.ReportRequestRepository;
import com.carddemo.backend.repository.TransactionCategoryRepository;
import com.carddemo.backend.repository.TransactionIdAllocationRepository;
import com.carddemo.backend.repository.TransactionTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.persistence.EntityManager;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class WorkflowIntegrationTest {
    private static final long ACCOUNT_ID = 12345678901L;
    private static final String CARD_NUMBER = "1234567890123456";

    @Autowired private CardDemoApplicationService service;
    @Autowired private AccountRepository accounts;
    @Autowired private CustomerRepository customers;
    @Autowired private CardRepository cards;
    @Autowired private CardAccountAssignmentRepository assignments;
    @Autowired private CreditCardTransactionRepository transactions;
    @Autowired private TransactionTypeRepository transactionTypes;
    @Autowired private TransactionCategoryRepository transactionCategories;
    @Autowired private TransactionIdAllocationRepository transactionIds;
    @Autowired private ReportRequestRepository reportRequests;
    @Autowired private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        reportRequests.deleteAll();
        transactions.deleteAll();
        transactionCategories.deleteAll();
        transactionTypes.deleteAll();
        assignments.deleteAll();
        cards.deleteAll();
        customers.deleteAll();
        accounts.deleteAll();
        transactionIds.deleteAll();

        Account account = new Account(ACCOUNT_ID);
        account.setActiveStatus("Y");
        account.setCurrentBalance(new BigDecimal("100.00"));
        account.setCreditLimit(new BigDecimal("500.00"));
        account.setCashCreditLimit(new BigDecimal("100.00"));
        account.setOpenDate("20240101");
        account.setExpirationDate("20260101");
        account.setReissueDate("20240101");
        account.setCurrentCycleCredit(BigDecimal.ZERO);
        account.setCurrentCycleDebit(BigDecimal.ZERO);
        account.setAddressZip("02108");
        account.setAccountGroupId("STANDARD");
        accounts.saveAndFlush(account);

        Customer customer = new Customer(123456789L);
        customers.saveAndFlush(customer);
        Card card = cards.saveAndFlush(new Card(CARD_NUMBER, account));
        CardAccountAssignment assignment = new CardAccountAssignment(card, customer, account);
        entityManager.persist(assignment);
        entityManager.flush();
        addTypeAndCategory("01", 1);
        addTypeAndCategory("02", 2);
    }

    @Test
    void createsRelatedTransactionAndAllocatesMonotonicUniqueIds() {
        ApiDtos.TransactionCreateResponse first = service.addTransaction(transactionRequest("Purchase one"));
        ApiDtos.TransactionCreateResponse second = service.addTransaction(transactionRequest("Purchase two"));

        assertThat(first.transaction().transactionId()).isEqualTo("0000000000000001");
        assertThat(second.transaction().transactionId()).isEqualTo("0000000000000002");
        assertThat(transactions.findById(second.transaction().transactionId())).isPresent()
                .get().extracting(transaction -> transaction.getCard().getAccount().getAccountId()).isEqualTo(ACCOUNT_ID);
    }

    @Test
    void rejectsRelationshipFailureWithoutPersistingTransaction() {
        ApiDtos.TransactionCreateRequest invalid = new ApiDtos.TransactionCreateRequest(ACCOUNT_ID, "9999999999999999", "01", 1,
                "POS", "Purchase", new BigDecimal("10.00"), 1L, "Merchant", "Boston", "02108",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), "Y");

        assertThatThrownBy(() -> service.addTransaction(invalid)).isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode()).isEqualTo("CARD_NOT_FOUND");
        assertThat(transactions.count()).isZero();
        assertThat(transactionIds.count()).isZero();
    }

    @Test
    void rejectsStaleAccountSnapshotWithoutWritingEitherRecord() {
        Long persistedVersion = accounts.findById(ACCOUNT_ID).orElseThrow().getVersion();
        ApiDtos.AccountUpdateRequest request = accountUpdate(persistedVersion + 1, null, new BigDecimal("120.00"));

        assertThatThrownBy(() -> service.updateAccount(ACCOUNT_ID, request)).isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode()).isEqualTo("STALE_WRITE");
        assertThat(accounts.findById(ACCOUNT_ID).orElseThrow().getCurrentBalance())
                .isEqualByComparingTo("100.00");
    }

    @Test
    void rollsBackPaymentWhenPaymentConfigurationIsMissing() {
        transactionCategories.deleteById(new TransactionCategoryId("02", 2));
        transactionCategories.flush();

        assertThatThrownBy(() -> service.payBalance(ACCOUNT_ID, new ApiDtos.PaymentRequest("Y")))
                .isInstanceOf(ApiException.class)
                .extracting(exception -> ((ApiException) exception).getCode()).isEqualTo("PAYMENT_CATEGORY_NOT_FOUND");
        assertThat(accounts.findById(ACCOUNT_ID).orElseThrow().getCurrentBalance())
                .isEqualByComparingTo("100.00");
        assertThat(transactions.count()).isZero();
        assertThat(transactionIds.count()).isZero();
    }

    @Test
    void savesPaymentAndReportRequestAsRetrievableWorkflowState() {
        ApiDtos.PaymentResponse payment = service.payBalance(ACCOUNT_ID, new ApiDtos.PaymentRequest("Y"));
        ApiDtos.ReportResponse submitted = service.requestReport(new ApiDtos.ReportRequest(ApiDtos.ReportType.CUSTOM,
                LocalDate.now(), LocalDate.now(), "Y"));
        ApiDtos.ReportResponse output = service.report(submitted.requestId());

        assertThat(payment.newBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(transactions.findById(payment.transaction().transactionId())).isPresent();
        assertThat(submitted.requestId()).isNotNull();
        assertThat(submitted.status()).isEqualTo("SUBMITTED");
        assertThat(output.transactions()).extracting(ApiDtos.TransactionResponse::transactionId)
                .contains(payment.transaction().transactionId());
    }

    private void addTypeAndCategory(String typeCode, int categoryCode) {
        TransactionType type = transactionTypes.saveAndFlush(new TransactionType(typeCode));
        transactionCategories.saveAndFlush(new TransactionCategory(new TransactionCategoryId(typeCode, categoryCode), type));
    }

    private ApiDtos.TransactionCreateRequest transactionRequest(String description) {
        return new ApiDtos.TransactionCreateRequest(ACCOUNT_ID, null, "01", 1, "POS", description,
                new BigDecimal("10.00"), 1L, "Merchant", "Boston", "02108", LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 2), "Y");
    }

    private ApiDtos.AccountUpdateRequest accountUpdate(Long expectedAccountVersion, Long expectedCustomerVersion,
                                                         BigDecimal balance) {
        return new ApiDtos.AccountUpdateRequest("Y", balance, new BigDecimal("500.00"), new BigDecimal("100.00"),
                "20240101", "20260101", "20240101", BigDecimal.ZERO, BigDecimal.ZERO, "02108", "STANDARD",
                null, expectedAccountVersion, expectedCustomerVersion);
    }
}
