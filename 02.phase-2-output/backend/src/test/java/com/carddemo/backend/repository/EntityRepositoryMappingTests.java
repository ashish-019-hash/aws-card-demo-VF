package com.carddemo.backend.repository;

import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.entity.CardAccountAssignment;
import com.carddemo.backend.entity.CreditCardTransaction;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.entity.DisclosureGroupRate;
import com.carddemo.backend.entity.DisclosureGroupRateId;
import com.carddemo.backend.entity.TransactionCategory;
import com.carddemo.backend.entity.TransactionCategoryBalance;
import com.carddemo.backend.entity.TransactionCategoryBalanceId;
import com.carddemo.backend.entity.TransactionCategoryId;
import com.carddemo.backend.entity.TransactionType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class EntityRepositoryMappingTests {

    @Autowired private AccountRepository accountRepository;
    @Autowired private ApplicationUserRepository applicationUserRepository;
    @Autowired private CardAccountAssignmentRepository cardAccountAssignmentRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private CreditCardTransactionRepository creditCardTransactionRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private DisclosureGroupRateRepository disclosureGroupRateRepository;
    @Autowired private TransactionCategoryBalanceRepository transactionCategoryBalanceRepository;
    @Autowired private TransactionCategoryRepository transactionCategoryRepository;
    @Autowired private TransactionTypeRepository transactionTypeRepository;
    @Autowired private TestEntityManager entityManager;

    @Test
    void persistsEveryBusinessEntityWithItsDocumentedRelationships() {
        Account account = accountRepository.save(new Account(12345678901L));
        Customer customer = customerRepository.save(new Customer(123456789L));
        Card card = cardRepository.save(new Card("1234567890123456", account));
        entityManager.persist(new CardAccountAssignment(card, customer, account));
        entityManager.flush();

        TransactionType transactionType = transactionTypeRepository.save(new TransactionType("CR"));
        TransactionCategoryId categoryId = new TransactionCategoryId("CR", 1001);
        TransactionCategory category = transactionCategoryRepository.save(new TransactionCategory(categoryId, transactionType));

        TransactionCategoryBalanceId balanceId = new TransactionCategoryBalanceId(account.getAccountId(), "CR", 1001);
        TransactionCategoryBalance balance = new TransactionCategoryBalance(balanceId, account, category);
        balance.setBalance(new BigDecimal("123456789.12"));
        transactionCategoryBalanceRepository.save(balance);

        DisclosureGroupRateId rateId = new DisclosureGroupRateId("STANDARD", "CR", 1001);
        DisclosureGroupRate rate = new DisclosureGroupRate(rateId, category);
        rate.setInterestRate(new BigDecimal("1234.56"));
        disclosureGroupRateRepository.save(rate);

        CreditCardTransaction transaction = new CreditCardTransaction("0000000000000001");
        transaction.setTransactionType(transactionType);
        transaction.setTransactionCategory(category);
        transaction.setCard(card);
        transaction.setAmount(new BigDecimal("999999999.99"));
        creditCardTransactionRepository.save(transaction);

        applicationUserRepository.save(new ApplicationUser("USER0001"));

        assertThat(cardAccountAssignmentRepository.findById(card.getCardNumber()))
                .isPresent()
                .get()
                .extracting(assignment -> assignment.getCustomer().getCustomerId())
                .isEqualTo(customer.getCustomerId());
        assertThat(creditCardTransactionRepository.findById(transaction.getTransactionId()))
                .isPresent()
                .get()
                .extracting(savedTransaction -> savedTransaction.getCard().getAccount().getAccountId())
                .isEqualTo(account.getAccountId());
        assertThat(transactionCategoryBalanceRepository.findById(balanceId)).isPresent();
        assertThat(disclosureGroupRateRepository.findById(rateId)).isPresent();
        assertThat(applicationUserRepository.findById("USER0001")).isPresent();
    }
}
