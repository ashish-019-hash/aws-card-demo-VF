package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aws.carddemo.dto.AccountDto;
import com.aws.carddemo.dto.AccountProfileDto;
import com.aws.carddemo.dto.AccountProfileUpdateRequest;
import com.aws.carddemo.dto.AccountRequest;
import com.aws.carddemo.dto.BillPaymentRequest;
import com.aws.carddemo.dto.BillPaymentResponse;
import com.aws.carddemo.dto.CreditCardDto;
import com.aws.carddemo.dto.CreditCardRequest;
import com.aws.carddemo.dto.CustomerRequest;
import com.aws.carddemo.dto.TransactionDto;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.entity.Account;
import com.aws.carddemo.entity.CardCrossReference;
import com.aws.carddemo.entity.CreditCard;
import com.aws.carddemo.entity.Customer;
import com.aws.carddemo.entity.TransactionCategory;
import com.aws.carddemo.entity.TransactionCategoryId;
import com.aws.carddemo.entity.TransactionType;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.AccountRepository;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.repository.CardTransactionRepository;
import com.aws.carddemo.repository.CreditCardRepository;
import com.aws.carddemo.repository.CustomerRepository;
import com.aws.carddemo.repository.TransactionCategoryRepository;
import com.aws.carddemo.repository.TransactionTypeRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Commit/rollback-level checks for the data workflows. This test is intentionally
 * NOT @Transactional: the services own their transactions, so a rollback here is a
 * real database rollback, matching the legacy COACTUPC unit-of-work semantics.
 */
@SpringBootTest
class DataIntegrityIntegrationTest {
    private static final long ACCOUNT_ID = 98765432101L;
    private static final long OTHER_ACCOUNT_ID = 98765432102L;
    private static final long CUSTOMER_ID = 987654321L;
    private static final long OTHER_CUSTOMER_ID = 987654322L;
    private static final String CARD_NUMBER = "9999888877776666";
    private static final String OTHER_CARD_NUMBER = "4444333322221111";
    private static final String UNLINKED_CARD_NUMBER = "2222111133335555";

    @Autowired AccountProfileWorkflowService profiles;
    @Autowired AccountDataService accountData;
    @Autowired CustomerDataService customerData;
    @Autowired CardDataService cardData;
    @Autowired TransactionDataService transactionData;
    @Autowired BillPaymentWorkflowService billPayments;
    @Autowired AccountRepository accounts;
    @Autowired CustomerRepository customers;
    @Autowired CreditCardRepository cards;
    @Autowired CardCrossReferenceRepository crossReferences;
    @Autowired CardTransactionRepository transactions;
    @Autowired TransactionTypeRepository types;
    @Autowired TransactionCategoryRepository categories;

    @BeforeEach
    void seed() {
        cleanUp();
        type("01", "Purchase", 1, "General");
        type("02", "Payment", 2, "Bill payment");
        account(ACCOUNT_ID, "150.00");
        account(OTHER_ACCOUNT_ID, "90.00");
        customer(CUSTOMER_ID, "Alice");
        customer(OTHER_CUSTOMER_ID, "Bob");
        card(CARD_NUMBER, ACCOUNT_ID);
        card(OTHER_CARD_NUMBER, OTHER_ACCOUNT_ID);
        card(UNLINKED_CARD_NUMBER, ACCOUNT_ID);
        crossReference(CARD_NUMBER, ACCOUNT_ID, CUSTOMER_ID);
        crossReference(OTHER_CARD_NUMBER, OTHER_ACCOUNT_ID, OTHER_CUSTOMER_ID);
    }

    @AfterEach
    void cleanUp() {
        transactions.deleteAll();
        crossReferences.deleteAll();
        cards.deleteAll();
        customers.deleteAll();
        accounts.deleteAll();
        categories.deleteAll();
        types.deleteAll();
    }

    @Test
    void profileUpdateCommitsBothRecordsAndSupportsConsecutiveEdits() {
        AccountProfileDto first = profiles.update(ACCOUNT_ID, new AccountProfileUpdateRequest(
                accountRequest(0L, "175.50"), customerRequest(0L, "Alicia")));
        assertThat(first.account().version()).isEqualTo(1L);
        assertThat(first.account().currentBalance()).isEqualByComparingTo("175.50");
        assertThat(first.customer().version()).isEqualTo(1L);
        assertThat(first.customer().firstName()).isEqualTo("Alicia");

        // The returned versions must be usable immediately for a consecutive edit.
        AccountProfileDto second = profiles.update(ACCOUNT_ID, new AccountProfileUpdateRequest(
                accountRequest(first.account().version(), "180.00"),
                customerRequest(first.customer().version(), "Alicia")));
        assertThat(second.account().version()).isEqualTo(2L);
        assertThat(second.account().currentBalance()).isEqualByComparingTo("180.00");
        // Only the account side changed, so the customer version must not move.
        assertThat(second.customer().version()).isEqualTo(1L);
    }

    @Test
    void profileUpdateRollsBackTheAccountWhenTheCustomerVersionIsStale() {
        assertThatThrownBy(() -> profiles.update(ACCOUNT_ID, new AccountProfileUpdateRequest(
                accountRequest(0L, "175.50"), customerRequest(99L, "Alicia"))))
                .isInstanceOf(ResourceConflictException.class);

        Account account = accounts.findById(ACCOUNT_ID).orElseThrow();
        assertThat(account.getCurrentBalance()).isEqualByComparingTo("150.00");
        assertThat(account.getVersion()).isZero();
        assertThat(customers.findById(CUSTOMER_ID).orElseThrow().getFirstName()).isEqualTo("Alice");
    }

    @Test
    void profileUpdateRequiresAChangeSomewhereOnTheProfile() {
        assertThatThrownBy(() -> profiles.update(ACCOUNT_ID, new AccountProfileUpdateRequest(
                accountRequest(0L, "150.00"), customerRequest(0L, "Alice"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must change");
    }

    @Test
    void singleRecordUpdatesReturnTheIncrementedVersionForConsecutiveEdits() {
        AccountDto updated = accountData.update(ACCOUNT_ID, accountRequest(0L, "151.00"));
        assertThat(updated.version()).isEqualTo(1L);
        assertThat(accountData.update(ACCOUNT_ID, accountRequest(updated.version(), "152.00")).version()).isEqualTo(2L);

        CreditCardDto card = cardData.update(CARD_NUMBER, cardRequest(0L, ACCOUNT_ID, "ALICE A"));
        assertThat(card.version()).isEqualTo(1L);
        assertThat(cardData.update(CARD_NUMBER, cardRequest(card.version(), ACCOUNT_ID, "ALICE B")).version()).isEqualTo(2L);
    }

    @Test
    void cardCannotBeReassignedToAnotherAccount() {
        assertThatThrownBy(() -> cardData.update(CARD_NUMBER, cardRequest(0L, OTHER_ACCOUNT_ID, "ALICE A")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("reassigned");
        assertThat(cards.findById(CARD_NUMBER).orElseThrow().getAccountId()).isEqualTo(ACCOUNT_ID);
    }

    @Test
    void transactionKeysResolveThroughTheCrossReferenceWithAccountPrecedence() {
        TransactionDto byAccount = transactionData.create(transactionRequest("9000000000000001", ACCOUNT_ID, null));
        assertThat(byAccount.cardNumber()).isEqualTo(CARD_NUMBER);

        TransactionDto byCard = transactionData.create(transactionRequest("9000000000000002", null, OTHER_CARD_NUMBER));
        assertThat(byCard.cardNumber()).isEqualTo(OTHER_CARD_NUMBER);

        assertThatThrownBy(() -> transactionData.create(transactionRequest("9000000000000003", ACCOUNT_ID, OTHER_CARD_NUMBER)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong");

        // A card with no cross-reference entry mirrors the legacy CCXREF NOTFND error.
        assertThatThrownBy(() -> transactionData.create(transactionRequest("9000000000000004", null, UNLINKED_CARD_NUMBER)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(transactions.existsById("9000000000000003")).isFalse();
        assertThat(transactions.existsById("9000000000000004")).isFalse();
    }

    @Test
    void duplicateTransactionIdsAreRejectedWithoutOverwritingTheOriginal() {
        transactionData.create(transactionRequest("9000000000000010", ACCOUNT_ID, null));
        TransactionRequest duplicate = new TransactionRequest("9000000000000010", ACCOUNT_ID, "01", 1,
                "POS TERM", "SECOND WRITE", "+00000009.99", "000000002", "Other Merchant", "Other City", "10002",
                null, "2024-02-02", "2024-02-03", "Y");
        assertThatThrownBy(() -> transactionData.create(duplicate)).isInstanceOf(ResourceConflictException.class);
        assertThat(transactions.findById("9000000000000010").orElseThrow().getDescription()).isEqualTo("Purchase");
    }

    @Test
    void billPaymentsAllocateDistinctIdsAndNeverOverwriteExistingTransactions() {
        BillPaymentResponse first = billPayments.pay(new BillPaymentRequest(ACCOUNT_ID, "Y"));
        BillPaymentResponse second = billPayments.pay(new BillPaymentRequest(OTHER_ACCOUNT_ID, "Y"));
        assertThat(second.transactionId()).isNotEqualTo(first.transactionId());
        assertThat(transactions.findById(first.transactionId())).isPresent();
        assertThat(transactions.findById(second.transactionId())).isPresent();
        // Allocation also skips over manually keyed transactions holding higher IDs.
        transactionData.create(transactionRequest("9999999999999997", ACCOUNT_ID, null));
        accounts.findById(ACCOUNT_ID).map(account -> { account.setCurrentBalance(new BigDecimal("10.00")); return accounts.save(account); }).orElseThrow();
        BillPaymentResponse third = billPayments.pay(new BillPaymentRequest(ACCOUNT_ID, "Y"));
        assertThat(third.transactionId()).isEqualTo("9999999999999998");
    }

    private AccountRequest accountRequest(Long version, String balance) {
        return new AccountRequest(version, "Y", new BigDecimal(balance), new BigDecimal("1000.00"), new BigDecimal("100.00"),
                "2020-01-01", "2030-12-31", "2029-12-31", new BigDecimal("0.00"), new BigDecimal("1.00"), "10001", "G1");
    }

    private CustomerRequest customerRequest(Long version, String firstName) {
        return new CustomerRequest(version, firstName, "", "User", "1 Main Street", "", "New York", "NY", "USA", "10001",
                "2125550100", "", "123456789", "ID123", "2000-01-01", "1234567890", "Y", 700);
    }

    private CreditCardRequest cardRequest(Long version, Long accountId, String embossedName) {
        return new CreditCardRequest(version, accountId, 123, embossedName, "2030-12-01", "Y");
    }

    private TransactionRequest transactionRequest(String id, Long accountId, String cardNumber) {
        return new TransactionRequest(id, accountId, "01", 1, "POS TERM", "Purchase", "+00000001.00",
                "000000001", "Merchant", "City", "10001", cardNumber, "2024-01-01", "2024-01-02", "Y");
    }

    private void type(String typeCode, String typeDescription, int categoryCode, String categoryDescription) {
        TransactionType type = new TransactionType(); type.setCode(typeCode); type.setDescription(typeDescription); types.save(type);
        TransactionCategoryId id = new TransactionCategoryId(); id.setTransactionTypeCode(typeCode); id.setTransactionCategoryCode(categoryCode);
        TransactionCategory category = new TransactionCategory(); category.setId(id); category.setDescription(categoryDescription); categories.save(category);
    }

    private void account(long id, String balance) {
        Account account = new Account(); account.setId(id); account.setActiveStatus("Y"); account.setCurrentBalance(new BigDecimal(balance));
        account.setCreditLimit(new BigDecimal("1000.00")); account.setCashCreditLimit(new BigDecimal("100.00"));
        account.setOpenDate("2020-01-01"); account.setExpirationDate("2030-12-31"); account.setReissueDate("2029-12-31");
        account.setCurrentCycleCredit(new BigDecimal("0.00")); account.setCurrentCycleDebit(new BigDecimal("1.00"));
        account.setAddressZip("10001"); account.setGroupId("G1"); accounts.save(account);
    }

    private void customer(long id, String firstName) {
        Customer customer = new Customer(); customer.setId(id); customer.setFirstName(firstName); customer.setMiddleName("");
        customer.setLastName("User"); customer.setAddressLine1("1 Main Street"); customer.setAddressLine2("");
        customer.setAddressLine3("New York"); customer.setAddressStateCode("NY"); customer.setAddressCountryCode("USA");
        customer.setAddressZip("10001"); customer.setPhoneNumber1("2125550100"); customer.setPhoneNumber2("");
        customer.setSsn(123456789L); customer.setGovernmentIssuedId("ID123"); customer.setDateOfBirth("2000-01-01");
        customer.setEftAccountId("1234567890"); customer.setPrimaryCardholderIndicator("Y"); customer.setFicoCreditScore(700);
        customers.save(customer);
    }

    private void card(String cardNumber, long accountId) {
        CreditCard card = new CreditCard(); card.setCardNumber(cardNumber); card.setAccountId(accountId);
        card.setCvvCode(123); card.setEmbossedName("ALICE USER"); card.setExpirationDate("2030-12-01"); card.setActiveStatus("Y");
        cards.save(card);
    }

    private void crossReference(String cardNumber, long accountId, long customerId) {
        CardCrossReference reference = new CardCrossReference(); reference.setCardNumber(cardNumber);
        reference.setAccountId(accountId); reference.setCustomerId(customerId); crossReferences.save(reference);
    }
}
