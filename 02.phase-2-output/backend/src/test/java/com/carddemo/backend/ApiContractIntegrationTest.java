package com.carddemo.backend;

import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.entity.CreditCardTransaction;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CreditCardTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end HTTP coverage for STORY-001 through STORY-018. Seeded records are
 * intentional manual-test fixtures; tests create uniquely named security users.
 */
@SpringBootTest(properties = {"carddemo.database.seed=true", "carddemo.database.reset=true"})
@AutoConfigureMockMvc
class ApiContractIntegrationTest {
    private static final long ACCOUNT_ID = 1L;
    private static final String CARD_NUMBER = "0500024453765740";

    @Autowired private MockMvc mvc;
    @Autowired private AccountRepository accounts;
    @Autowired private CardRepository cards;
    @Autowired private CreditCardTransactionRepository transactions;

    @BeforeEach
    void resetPaymentFixture() {
        Account account = accounts.findById(ACCOUNT_ID).orElseThrow();
        account.setCurrentBalance(new BigDecimal("194.00"));
        accounts.saveAndFlush(account);
    }

    @Test
    void signOnAndMenusCoverStories001Through003AndRoleOutcomes() throws Exception {
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"admin001\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMINISTRATOR"))
                .andExpect(jsonPath("$.destination").value("/api/admin/menu"));
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"user0001\",\"password\":\"user123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"));
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"USER0001\",\"password\":\"wrong\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("WRONG_PASSWORD"));
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON).content("{\"userId\":\"\",\"password\":\"x\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-025"));
        mvc.perform(get("/api/menu")).andExpect(status().isOk()).andExpect(jsonPath("$.options.length()").value(10));
        mvc.perform(get("/api/admin/menu")).andExpect(status().isOk()).andExpect(jsonPath("$.options.length()").value(4));
    }

    @Test
    void accountAndCardEndpointsCoverStories004Through008() throws Exception {
        mvc.perform(get("/api/accounts/{accountId}", ACCOUNT_ID)).andExpect(status().isOk())
                .andExpect(jsonPath("$.accountId").value(ACCOUNT_ID)).andExpect(jsonPath("$.customer").exists());
        mvc.perform(get("/api/accounts/0")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-002"));
        mvc.perform(get("/api/cards").param("size", "1")).andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1));
        mvc.perform(get("/api/cards").param("accountId", String.valueOf(ACCOUNT_ID))).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].accountId").value(ACCOUNT_ID));
        mvc.perform(get("/api/cards/{cardNumber}", CARD_NUMBER)).andExpect(status().isOk())
                .andExpect(jsonPath("$.cardNumber").value(CARD_NUMBER));
        mvc.perform(get("/api/cards/not-a-card")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-015"));

        String currentName = cards.findById(CARD_NUMBER).orElseThrow().getEmbossedName();
        mvc.perform(put("/api/cards/{cardNumber}", CARD_NUMBER).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"embossedName\":\"QA Card Holder\",\"expirationDate\":\"2028-12-01\",\"activeStatus\":\"Y\",\"expectedVersion\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.changed").value(true));
        mvc.perform(put("/api/cards/{cardNumber}", CARD_NUMBER).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"embossedName\":\"QA Card Holder\",\"expirationDate\":\"2028-12-01\",\"activeStatus\":\"Y\",\"expectedVersion\":0}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_WRITE"));
        assertThat(currentName).isNotBlank();
    }

    @Test
    void transactionEndpointsCoverStories009Through011IncludingNegativeValidation() throws Exception {
        mvc.perform(get("/api/transactions").param("size", "2")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2));
        mvc.perform(get("/api/transactions").param("fromTransactionId", "x"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-027"));
        String existingId = transactions.findAll().getFirst().getTransactionId();
        mvc.perform(get("/api/transactions/{transactionId}", existingId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId").value(existingId));
        mvc.perform(get("/api/transactions/{transactionId}", "9999999999999999")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRANSACTION_NOT_FOUND"));

        long before = transactions.count();
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content(transactionJson("Y")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ADDED"))
                .andExpect(jsonPath("$.transaction.transactionId").isNotEmpty());
        assertThat(transactions.count()).isEqualTo(before + 1);
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content(transactionJson("N")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-029"));
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":1,\"transactionTypeCode\":\"01\",\"transactionCategoryCode\":1,\"source\":\"POS\",\"description\":\"bad\",\"amount\":1.001,\"merchantId\":1,\"merchantName\":\"Shop\",\"merchantCity\":\"Boston\",\"merchantZip\":\"02108\",\"originDate\":\"2026-02-30\",\"processingDate\":\"2026-02-30\",\"confirmation\":\"Y\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void paymentAndUserAdministrationCoverStories012Through016() throws Exception {
        long before = transactions.count();
        mvc.perform(post("/api/accounts/{accountId}/payments", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON).content("{\"confirmation\":\"Y\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.newBalance").value(0));
        assertThat(transactions.count()).isEqualTo(before + 1);
        mvc.perform(post("/api/accounts/{accountId}/payments", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON).content("{\"confirmation\":\"Y\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NOTHING_TO_PAY"));
        mvc.perform(post("/api/accounts/{accountId}/payments", ACCOUNT_ID).contentType(MediaType.APPLICATION_JSON).content("{\"confirmation\":\"maybe\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-026"));

        String user = "QAUSER01";
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(userJson(user, "QA", "Tester", "PASS", "U")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.userId").value(user));
        mvc.perform(get("/api/users").param("startsWith", "qau")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].userId").value(user));
        mvc.perform(get("/api/users/{userId}", user)).andExpect(status().isOk()).andExpect(jsonPath("$.firstName").value("QA"));
        mvc.perform(put("/api/users/{userId}", user).contentType(MediaType.APPLICATION_JSON).content("{\"firstName\":\"Quality\",\"lastName\":\"Tester\",\"password\":\"PASS2\",\"userType\":\"A\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.changed").value(true));
        mvc.perform(delete("/api/users/{userId}", user)).andExpect(status().isNoContent());
        mvc.perform(get("/api/users/{userId}", user)).andExpect(status().isNotFound());
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(userJson("ADMIN001", "A", "B", "P", "U")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_USER"));
    }

    @Test
    void reportLifecycleAndOpenApiCoverStories017And018() throws Exception {
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content(transactionJson("Y", "2098-06-15", "2098-06-16")))
                .andExpect(status().isOk());
        mvc.perform(post("/api/reports/requests").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CUSTOM\",\"startDate\":\"2098-06-16\",\"endDate\":\"2098-06-16\",\"confirmation\":\"Y\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.transactions.length()").value(1))
                .andExpect(jsonPath("$.transactions[0].processingTimestamp").value("2098-06-16"));
        mvc.perform(post("/api/reports/requests").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CUSTOM\",\"startDate\":\"2098-06-16\",\"endDate\":\"2098-06-16\",\"confirmation\":\"N\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.ruleId").value("RULE-VAL-038"));
        mvc.perform(get("/api/reports/transactions").param("startDate", "2098-06-16").param("endDate", "2098-06-16"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("OUTPUT"))
                .andExpect(jsonPath("$.transactions.length()").value(1));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.paths['/api/accounts/{accountId}']").exists());
    }

    private String transactionJson(String confirmation) {
        return transactionJson(confirmation, "2026-01-01", "2026-01-02");
    }

    private String transactionJson(String confirmation, String originDate, String processingDate) {
        return "{\"accountId\":1,\"transactionTypeCode\":\"01\",\"transactionCategoryCode\":1,\"source\":\"POS\",\"description\":\"QA purchase\",\"amount\":\"10.00\",\"merchantId\":1,\"merchantName\":\"QA Shop\",\"merchantCity\":\"Boston\",\"merchantZip\":\"02108\",\"originDate\":\"" + originDate + "\",\"processingDate\":\"" + processingDate + "\",\"confirmation\":\"" + confirmation + "\"}";
    }

    private String userJson(String userId, String firstName, String lastName, String password, String type) {
        return "{\"userId\":\"" + userId + "\",\"firstName\":\"" + firstName + "\",\"lastName\":\"" + lastName + "\",\"password\":\"" + password + "\",\"userType\":\"" + type + "\"}";
    }
}
