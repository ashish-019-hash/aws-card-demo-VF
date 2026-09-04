package com.carddemo.backend;

import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CreditCardTransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Focused HTTP edge coverage for account/card maintenance, transaction capture,
 * payment eligibility, user lifecycle, reports, and list boundaries.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:carddemo-api-edge-${random.uuid};DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "carddemo.database.seed=true",
        "carddemo.database.reset=true"
})
@AutoConfigureMockMvc
class ApiEdgeCaseIntegrationTest {
    private static final long ACCOUNT_ID = 1L;
    private static final String CARD_NUMBER = "0500024453765740";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AccountRepository accounts;
    @Autowired private CardRepository cards;
    @Autowired private CreditCardTransactionRepository transactions;

    @BeforeEach
    void resetMutableFixtures() {
        Account account = accounts.findById(ACCOUNT_ID).orElseThrow();
        account.setCurrentBalance(new BigDecimal("194.00"));
        accounts.saveAndFlush(account);

        Card card = cards.findById(CARD_NUMBER).orElseThrow();
        card.setEmbossedName("QA Card Holder");
        card.setExpirationDate("2028-12-01");
        card.setActiveStatus("Y");
        cards.saveAndFlush(card);
    }

    @Test
    void accountUpdateOverHttpPersistsChangedValueAndRejectsNoOpAndMissingVersion() throws Exception {
        Account account = accounts.findById(ACCOUNT_ID).orElseThrow();
        mvc.perform(put("/api/accounts/{accountId}", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON)
                        .content(accountUpdateJson("195.00", account.getVersion())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.changed").value(true));
        assertThat(accounts.findById(ACCOUNT_ID).orElseThrow().getCurrentBalance()).isEqualByComparingTo("195.00");

        Account updated = accounts.findById(ACCOUNT_ID).orElseThrow();
        mvc.perform(put("/api/accounts/{accountId}", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON)
                        .content(accountUpdateJson("195.00", updated.getVersion())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NO_CHANGES"));
        mvc.perform(put("/api/accounts/{accountId}", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON)
                        .content(accountUpdateJson("196.00", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EXPECTED_VERSION_REQUIRED"));
    }

    @Test
    void cardUpdateRejectsNoOpMissingVersionAndFieldSpecificInvalidValues() throws Exception {
        Card card = cards.findById(CARD_NUMBER).orElseThrow();
        mvc.perform(put("/api/cards/{cardNumber}", CARD_NUMBER).contentType(MediaType.APPLICATION_JSON)
                        .content(cardUpdateJson("QA Card Holder", "2028-12-01", "Y", card.getVersion())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NO_CHANGES"));
        mvc.perform(put("/api/cards/{cardNumber}", CARD_NUMBER).contentType(MediaType.APPLICATION_JSON)
                        .content(cardUpdateJson("QA Card Holder", "2028-12-01", "Y", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EXPECTED_VERSION_REQUIRED"));
        mvc.perform(put("/api/cards/{cardNumber}", CARD_NUMBER).contentType(MediaType.APPLICATION_JSON)
                        .content(cardUpdateJson("QA-1", "2028-12-01", "Y", card.getVersion())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ruleId").value("RULE-VAL-017"))
                .andExpect(jsonPath("$.field").value("embossedName"));
        mvc.perform(put("/api/cards/{cardNumber}", CARD_NUMBER).contentType(MediaType.APPLICATION_JSON)
                        .content(cardUpdateJson("QA Card Holder", "2100-12-01", "Y", card.getVersion())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ruleId").value("RULE-VAL-020"))
                .andExpect(jsonPath("$.field").value("expirationDate"));
    }

    @Test
    void transactionCaptureReturnsFieldSpecificFailuresAndRejectsMalformedDatesWithoutWriting() throws Exception {
        long before = transactions.count();
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("amount", "1.001")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ruleId").value("RULE-VAL-033"))
                .andExpect(jsonPath("$.field").value("amount"));
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("merchantId", -1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ruleId").value("RULE-VAL-035"))
                .andExpect(jsonPath("$.field").value("merchantId"));
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("source", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ruleId").value("RULE-VAL-031"))
                .andExpect(jsonPath("$.field").value("source"));
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("originDate", "2026-02-30")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("processingDate", "not-a-date")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        assertThat(transactions.count()).isEqualTo(before);
    }

    @Test
    void zeroAndNegativeBalancesDoNotCreatePayments() throws Exception {
        assertIneligiblePayment(BigDecimal.ZERO);
        assertIneligiblePayment(new BigDecimal("-0.01"));
    }

    @Test
    void userLifecycleRejectsInvalidNoOpAndUnknownDeletion() throws Exception {
        String userId = "EDGE0001";
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(userJson(userId, "Tester")))
                .andExpect(status().isCreated());
        mvc.perform(put("/api/users/{userId}", userId).contentType(MediaType.APPLICATION_JSON)
                        .content(userUpdateJson("Tester")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NO_CHANGES"));
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(userJson("EDGE0002", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ruleId").value("RULE-VAL-023"))
                .andExpect(jsonPath("$.field").value("lastName"));
        mvc.perform(delete("/api/users/{userId}", userId)).andExpect(status().isNoContent());
        mvc.perform(get("/api/users/{userId}", userId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
        mvc.perform(delete("/api/users/UNKNOWN1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }

    @Test
    void reportRangeIncludesOnlyItsInclusiveBoundary() throws Exception {
        addTransaction("2097-06-15");
        String includedId = addTransaction("2097-06-16");
        addTransaction("2097-06-17");

        mvc.perform(get("/api/reports/transactions").param("startDate", "2097-06-16").param("endDate", "2097-06-16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactions.length()").value(1))
                .andExpect(jsonPath("$.transactions[0].transactionId").value(includedId));
    }

    @Test
    void cardAndTransactionListsHonorOptionalAndLowerBoundFilters() throws Exception {
        long cardCount = cards.count();
        mvc.perform(get("/api/cards").param("accountId", "0").param("page", "0").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(cardCount))
                .andExpect(jsonPath("$.content.length()").value(cardCount));
        mvc.perform(get("/api/cards").param("accountId", "0").param("page", "999").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
        mvc.perform(get("/api/cards").param("accountId", "2").param("cardNumber", CARD_NUMBER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CARD_NOT_FOUND"));

        var expectedTransactions = transactions.findByTransactionIdGreaterThanEqual("0000000000000001",
                PageRequest.of(0, 1, Sort.by("transactionId")));
        mvc.perform(get("/api/transactions").param("fromTransactionId", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(expectedTransactions.getTotalElements()))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].transactionId").value(expectedTransactions.getContent().getFirst().getTransactionId()));
    }

    private void assertIneligiblePayment(BigDecimal balance) throws Exception {
        Account account = accounts.findById(ACCOUNT_ID).orElseThrow();
        account.setCurrentBalance(balance);
        accounts.saveAndFlush(account);
        long before = transactions.count();
        mvc.perform(post("/api/accounts/{accountId}/payments", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmation\":\"Y\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOTHING_TO_PAY"));
        assertThat(transactions.count()).isEqualTo(before);
    }

    private String addTransaction(String processingDate) throws Exception {
        MvcResult result = mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("processingDate", processingDate)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .at("/transaction/transactionId").asText();
    }

    private String accountUpdateJson(String balance, Long version) throws Exception {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("activeStatus", "Y");
        request.put("currentBalance", balance);
        request.put("creditLimit", "202.00");
        request.put("cashCreditLimit", "102.00");
        request.put("openDate", "2014-11-20");
        request.put("expirationDate", "2025-05-20");
        request.put("reissueDate", "2025-05-20");
        request.put("currentCycleCredit", "0.00");
        request.put("currentCycleDebit", "0.00");
        request.put("addressZip", "000000000");
        request.put("accountGroupId", "A");
        if (version == null) request.putNull("expectedAccountVersion"); else request.put("expectedAccountVersion", version);
        return objectMapper.writeValueAsString(request);
    }

    private String cardUpdateJson(String name, String expirationDate, String activeStatus, Long version) throws Exception {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("embossedName", name);
        request.put("expirationDate", expirationDate);
        request.put("activeStatus", activeStatus);
        if (version == null) request.putNull("expectedVersion"); else request.put("expectedVersion", version);
        return objectMapper.writeValueAsString(request);
    }

    private String transactionJson(String overriddenField, Object value) throws Exception {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("accountId", ACCOUNT_ID);
        request.put("transactionTypeCode", "01");
        request.put("transactionCategoryCode", 1);
        request.put("source", "POS");
        request.put("description", "Edge purchase");
        request.put("amount", "10.00");
        request.put("merchantId", 1);
        request.put("merchantName", "QA Shop");
        request.put("merchantCity", "Boston");
        request.put("merchantZip", "02108");
        request.put("originDate", "2097-06-16");
        request.put("processingDate", "2097-06-16");
        request.put("confirmation", "Y");
        if (value instanceof String stringValue) request.put(overriddenField, stringValue);
        else if (value instanceof Integer integerValue) request.put(overriddenField, integerValue);
        else throw new IllegalArgumentException("Unsupported transaction value: " + value);
        return objectMapper.writeValueAsString(request);
    }

    private String userJson(String userId, String lastName) throws Exception {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("userId", userId);
        request.put("firstName", "Edge");
        request.put("lastName", lastName);
        request.put("password", "PASS");
        request.put("userType", "U");
        return objectMapper.writeValueAsString(request);
    }

    private String userUpdateJson(String lastName) throws Exception {
        ObjectNode request = objectMapper.createObjectNode();
        request.put("firstName", "Edge");
        request.put("lastName", lastName);
        request.put("password", "PASS");
        request.put("userType", "U");
        return objectMapper.writeValueAsString(request);
    }
}
