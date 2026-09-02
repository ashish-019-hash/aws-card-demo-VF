package com.carddemo.backend.config;

import com.carddemo.backend.entity.TransactionIdAllocation;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.ApplicationUserRepository;
import com.carddemo.backend.repository.CardAccountAssignmentRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CreditCardTransactionRepository;
import com.carddemo.backend.repository.CustomerRepository;
import com.carddemo.backend.repository.DisclosureGroupRateRepository;
import com.carddemo.backend.repository.TransactionCategoryBalanceRepository;
import com.carddemo.backend.repository.TransactionCategoryRepository;
import com.carddemo.backend.repository.TransactionIdAllocationRepository;
import com.carddemo.backend.repository.TransactionTypeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:carddemo-seed-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "carddemo.database.seed=true",
        "carddemo.database.reset=false"
})
class LegacyDatabaseInitializationTests {
    @Autowired private LegacyDatabaseInitializer initializer;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private AccountRepository accounts;
    @Autowired private CustomerRepository customers;
    @Autowired private CardRepository cards;
    @Autowired private CardAccountAssignmentRepository assignments;
    @Autowired private CreditCardTransactionRepository transactions;
    @Autowired private TransactionTypeRepository transactionTypes;
    @Autowired private TransactionCategoryRepository transactionCategories;
    @Autowired private TransactionCategoryBalanceRepository categoryBalances;
    @Autowired private DisclosureGroupRateRepository disclosureRates;
    @Autowired private ApplicationUserRepository users;
    @Autowired private TransactionIdAllocationRepository allocations;

    @Test
    void loadsEveryLegacyExtractWithFixedWidthRepresentationsAndRelationships() {
        assertThat(accounts.count()).isEqualTo(50);
        assertThat(customers.count()).isEqualTo(50);
        assertThat(cards.count()).isEqualTo(50);
        assertThat(assignments.count()).isEqualTo(50);
        assertThat(transactions.count()).isEqualTo(300);
        assertThat(transactionTypes.count()).isEqualTo(7);
        assertThat(transactionCategories.count()).isEqualTo(18);
        assertThat(categoryBalances.count()).isEqualTo(50);
        assertThat(disclosureRates.count()).isEqualTo(51);
        assertThat(users.count()).isEqualTo(2);

        assertThat(jdbc.queryForObject("select ACCT_CURR_BAL from ACCTDAT where ACCT_ID = 1", BigDecimal.class))
                .isEqualByComparingTo("194.00");
        String firstTransactionId = jdbc.queryForList("select TRAN_ID from TRANSACT order by TRAN_ID", String.class).getFirst();
        assertThat(jdbc.queryForObject("select TRAN_AMT from TRANSACT where TRAN_ID = ?", BigDecimal.class, firstTransactionId))
                .isEqualByComparingTo("504.77");
        assertThat(jdbc.queryForObject("select TRAN_ORIG_TS from TRANSACT where TRAN_ID = ?", String.class, firstTransactionId))
                .isEqualTo("2022-06-10 19:27:53.000000");
        assertThat(jdbc.queryForObject("select TRAN_PROC_TS from TRANSACT where TRAN_ID = ?", String.class, firstTransactionId))
                .isEqualTo("                          ");
        assertThat(jdbc.queryForObject("select count(*) from TRANSACT t join CARDDAT c on c.CARD_NUM = t.TRAN_CARD_NUM", Integer.class))
                .isEqualTo(300);
        long highestLegacyTransactionId = jdbc.queryForList("select TRAN_ID from TRANSACT", String.class).stream()
                .mapToLong(Long::parseLong).max().orElseThrow();
        assertThat(allocations.findById(TransactionIdAllocation.ALLOCATION_KEY)).isPresent()
                .get().extracting(TransactionIdAllocation::getLastAllocatedId).isEqualTo(highestLegacyTransactionId);
    }

    @Test
    void resetAndSeedRestoresTheDeterministicBaseline() {
        jdbc.update("delete from TRANSACT where TRAN_ID = ?", "0000000000000000");
        jdbc.update("update ACCTDAT set ACCT_CURR_BAL = ? where ACCT_ID = 1", new BigDecimal("1.00"));

        initializer.resetAndSeed();

        assertThat(transactions.count()).isEqualTo(300);
        assertThat(jdbc.queryForObject("select ACCT_CURR_BAL from ACCTDAT where ACCT_ID = 1", BigDecimal.class))
                .isEqualByComparingTo("194.00");
        long highestLegacyTransactionId = jdbc.queryForList("select TRAN_ID from TRANSACT", String.class).stream()
                .mapToLong(Long::parseLong).max().orElseThrow();
        assertThat(allocations.findById(TransactionIdAllocation.ALLOCATION_KEY)).isPresent()
                .get().extracting(TransactionIdAllocation::getLastAllocatedId).isEqualTo(highestLegacyTransactionId);
    }
}
