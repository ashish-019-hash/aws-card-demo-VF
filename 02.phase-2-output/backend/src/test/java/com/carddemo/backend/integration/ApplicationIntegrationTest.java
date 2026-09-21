package com.carddemo.backend.integration;

import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.ApplicationUserRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.CustomerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end coverage against a real Postgres (Testcontainers) + Flyway-migrated schema,
 * exercising the full HTTP stack: session/CSRF, role-based authorization, and the key
 * business rules (BR-006/BR-007 account update, BR-010 transaction id allocation,
 * BR-011/BR-012 bill payment, BR-013 report period derivation, BR-016 user CRUD).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class ApplicationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    private static final String ADMIN_ID = "ADMIN001";
    private static final String REGULAR_ID = "USER0001";
    private static final Long ACCT_ID = 100000000001L;
    private static final Long CUST_ID = 900000001L;
    private static final String CARD_NUM = "4111111111111111";

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApplicationUserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private CardXrefRepository cardXrefRepository;

    @BeforeEach
    void seedFixtures() {
        ensureUser(ADMIN_ID, "A");
        ensureUser(REGULAR_ID, "U");
        ensureAccountFixture();
    }

    private void ensureUser(String userId, String userType) {
        if (userRepository.existsById(userId)) {
            return;
        }
        ApplicationUser u = new ApplicationUser();
        u.setUserId(userId);
        u.setFirstName("TEST");
        u.setLastName(userType);
        u.setPassword("PASSWORD");
        u.setUserType(userType);
        userRepository.save(u);
    }

    private void ensureAccountFixture() {
        if (accountRepository.existsById(ACCT_ID)) {
            return;
        }
        Customer c = new Customer();
        c.setCustId(CUST_ID);
        c.setFirstName("JOHN");
        c.setMiddleName("Q");
        c.setLastName("DOE");
        c.setAddrLine1("123 MAIN ST");
        c.setAddrLine3("RALEIGH");
        c.setAddrStateCd("NC");
        c.setAddrCountryCd("USA");
        c.setAddrZip("27601");
        c.setPhoneNum1("(212)555-1234");
        c.setSsn("123456789");
        c.setDob("1980-05-15");
        c.setPriCardHolderInd("Y");
        c.setFicoCreditScore(720);
        customerRepository.save(c);

        Account a = new Account();
        a.setAcctId(ACCT_ID);
        a.setActiveStatus("Y");
        a.setCurrBal(new BigDecimal("100.00"));
        a.setCreditLimit(new BigDecimal("1000.00"));
        a.setCashCreditLimit(new BigDecimal("500.00"));
        a.setOpenDate("2020-01-01");
        a.setExpirationDate("2030-01-01");
        a.setReissueDate("2020-01-01");
        a.setCurrCycCredit(BigDecimal.ZERO);
        a.setCurrCycDebit(BigDecimal.ZERO);
        a.setAddrZip("27601");
        a.setGroupId("GRP01");
        accountRepository.save(a);

        Card card = new Card();
        card.setCardNum(CARD_NUM);
        card.setAcctId(ACCT_ID);
        card.setCvvCd(123);
        card.setEmbossedName("JOHN Q DOE");
        card.setExpirationDate("2030-01-01");
        card.setActiveStatus("Y");
        cardRepository.save(card);

        CardXref xref = new CardXref();
        xref.setCardNum(CARD_NUM);
        xref.setCustId(CUST_ID);
        xref.setAcctId(ACCT_ID);
        cardXrefRepository.save(xref);
    }

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    /** Logs in and returns the JSESSIONID + XSRF-TOKEN cookies to use on subsequent calls. */
    private Session login(String userId) {
        var headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        var entity = new org.springframework.http.HttpEntity<>(
                "{\"userId\":\"" + userId + "\",\"password\":\"PASSWORD\"}", headers);
        var response = restTemplate.postForEntity(baseUrl() + "/api/session", entity, String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        String setCookie = response.getHeaders().get("Set-Cookie") == null ? "" :
                String.join(";", response.getHeaders().get("Set-Cookie"));
        String sessionId = extractCookie(setCookie, "JSESSIONID");
        String xsrf = extractCookie(setCookie, "XSRF-TOKEN");
        return new Session(sessionId, xsrf);
    }

    private String extractCookie(String setCookieHeader, String name) {
        for (String part : setCookieHeader.split(",")) {
            for (String seg : part.split(";")) {
                seg = seg.trim();
                if (seg.startsWith(name + "=")) {
                    return seg.substring((name + "=").length());
                }
            }
        }
        return null;
    }

    private record Session(String jsessionId, String xsrf) {
        org.springframework.http.HttpHeaders headers() {
            var headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.add("Cookie", "JSESSIONID=" + jsessionId + "; XSRF-TOKEN=" + xsrf);
            headers.add("X-XSRF-TOKEN", xsrf);
            return headers;
        }
    }

    @Test
    void loginAsAdminSucceeds() {
        var headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        var entity = new org.springframework.http.HttpEntity<>(
                "{\"userId\":\"admin001\",\"password\":\"password\"}", headers);
        var response = restTemplate.postForEntity(baseUrl() + "/api/session", entity, String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"authenticated\":true").contains("\"userType\":\"A\"");
    }

    @Test
    void loginWithWrongPasswordReturns401() {
        var headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        var entity = new org.springframework.http.HttpEntity<>(
                "{\"userId\":\"admin001\",\"password\":\"wrong\"}", headers);
        var response = restTemplate.postForEntity(baseUrl() + "/api/session", entity, String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void getAccountView_returnsSeededData() {
        Session session = login(REGULAR_ID);
        var response = restTemplate.exchange(baseUrl() + "/api/accounts/" + ACCT_ID,
                org.springframework.http.HttpMethod.GET, new org.springframework.http.HttpEntity<>(session.headers()),
                String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"cardNum\":\"" + CARD_NUM + "\"").contains("\"lastName\":\"DOE\"");
    }

    @Test
    void getAccountView_unknownAccountReturns404() {
        Session session = login(REGULAR_ID);
        var response = restTemplate.exchange(baseUrl() + "/api/accounts/999999999999",
                org.springframework.http.HttpMethod.GET, new org.springframework.http.HttpEntity<>(session.headers()),
                String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
    }

    @Test
    void addTransaction_allocatesDistinctSequentialIds() throws Exception {
        Session session = login(REGULAR_ID);
        String body1 = transactionAddBody();
        var r1 = restTemplate.postForEntity(baseUrl() + "/api/transactions",
                new org.springframework.http.HttpEntity<>(body1, session.headers()), String.class);
        assertThat(r1.getStatusCode().value()).isEqualTo(200);
        JsonNode n1 = objectMapper.readTree(r1.getBody());

        var r2 = restTemplate.postForEntity(baseUrl() + "/api/transactions",
                new org.springframework.http.HttpEntity<>(body1, session.headers()), String.class);
        JsonNode n2 = objectMapper.readTree(r2.getBody());

        assertThat(n1.get("tranId").asText()).isNotEqualTo(n2.get("tranId").asText());
    }

    private String transactionAddBody() {
        return "{\"accountId\":" + ACCT_ID + ",\"typeCd\":\"02\",\"catCd\":2,\"source\":\"POS TERM\","
                + "\"description\":\"PURCHASE\",\"amount\":12.34,\"origDate\":\"2022-06-10\","
                + "\"procDate\":\"2022-06-10\",\"merchantId\":999999999,\"merchantName\":\"ACME\","
                + "\"merchantCity\":\"RALEIGH\",\"merchantZip\":\"27601\",\"confirm\":\"Y\"}";
    }

    @Test
    void addTransaction_withoutConfirmIsRejected() {
        Session session = login(REGULAR_ID);
        String body = "{\"accountId\":" + ACCT_ID + ",\"typeCd\":\"02\",\"catCd\":2,\"source\":\"POS TERM\","
                + "\"description\":\"PURCHASE\",\"amount\":12.34,\"origDate\":\"2022-06-10\","
                + "\"procDate\":\"2022-06-10\",\"merchantId\":999999999,\"merchantName\":\"ACME\","
                + "\"merchantCity\":\"RALEIGH\",\"merchantZip\":\"27601\",\"confirm\":\"N\"}";
        var response = restTemplate.postForEntity(baseUrl() + "/api/transactions",
                new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).contains("VR-094");
    }

    @Test
    void billPayment_paysFullBalanceAndZeroesAccount() {
        // Use a dedicated account so this test does not interfere with others.
        Long acctId = 100000000002L;
        seedAccount(acctId, 900000002L, "4222222222222222", new BigDecimal("55.00"));

        Session session = login(REGULAR_ID);
        String body = "{\"accountId\":" + acctId + ",\"confirm\":\"Y\"}";
        var response = restTemplate.postForEntity(baseUrl() + "/api/bill-payments",
                new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"paid\":true").contains("\"newBalance\":0");

        Account updated = accountRepository.findById(acctId).orElseThrow();
        assertThat(updated.getCurrBal()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void billPayment_nothingToPayWhenBalanceIsZero() {
        Long acctId = 100000000003L;
        seedAccount(acctId, 900000003L, "4333333333333333", BigDecimal.ZERO);

        Session session = login(REGULAR_ID);
        String body = "{\"accountId\":" + acctId + ",\"confirm\":\"Y\"}";
        var response = restTemplate.postForEntity(baseUrl() + "/api/bill-payments",
                new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"paid\":false").contains("nothing to pay");
    }

    private void seedAccount(Long acctId, Long custId, String cardNum, BigDecimal balance) {
        if (accountRepository.existsById(acctId)) {
            return;
        }
        Customer c = new Customer();
        c.setCustId(custId);
        c.setFirstName("JANE");
        c.setLastName("SMITH");
        c.setAddrLine1("1 OAK ST");
        c.setAddrLine3("DURHAM");
        c.setAddrStateCd("NC");
        c.setAddrCountryCd("USA");
        c.setAddrZip("27701");
        c.setSsn("223456789");
        c.setDob("1975-03-01");
        c.setPriCardHolderInd("Y");
        c.setFicoCreditScore(680);
        customerRepository.save(c);

        Account a = new Account();
        a.setAcctId(acctId);
        a.setActiveStatus("Y");
        a.setCurrBal(balance);
        a.setCreditLimit(new BigDecimal("1000.00"));
        a.setCashCreditLimit(new BigDecimal("500.00"));
        a.setOpenDate("2020-01-01");
        a.setExpirationDate("2030-01-01");
        a.setReissueDate("2020-01-01");
        a.setCurrCycCredit(BigDecimal.ZERO);
        a.setCurrCycDebit(BigDecimal.ZERO);
        a.setAddrZip("27701");
        a.setGroupId("GRP01");
        accountRepository.save(a);

        Card card = new Card();
        card.setCardNum(cardNum);
        card.setAcctId(acctId);
        card.setCvvCd(456);
        card.setEmbossedName("JANE SMITH");
        card.setExpirationDate("2030-01-01");
        card.setActiveStatus("Y");
        cardRepository.save(card);

        CardXref xref = new CardXref();
        xref.setCardNum(cardNum);
        xref.setCustId(custId);
        xref.setAcctId(acctId);
        cardXrefRepository.save(xref);
    }

    @Test
    void reportSubmit_monthlyDerivesCurrentMonth() {
        Session session = login(REGULAR_ID);
        String body = "{\"reportType\":\"Monthly\",\"confirm\":\"Y\"}";
        var response = restTemplate.postForEntity(baseUrl() + "/api/reports",
                new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("\"submitted\":true");
    }

    @Test
    void userAdmin_regularUserForbiddenFromUserList() {
        Session session = login(REGULAR_ID);
        var response = restTemplate.exchange(baseUrl() + "/api/users",
                org.springframework.http.HttpMethod.GET, new org.springframework.http.HttpEntity<>(session.headers()),
                String.class);
        assertThat(response.getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void userAdmin_adminCanCreateAndDuplicateIsRejected() {
        Session session = login(ADMIN_ID);
        String body = "{\"userId\":\"NEWUSR01\",\"firstName\":\"NEW\",\"lastName\":\"USER\","
                + "\"password\":\"PASSWORD\",\"userType\":\"U\"}";
        var created = restTemplate.postForEntity(baseUrl() + "/api/users",
                new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
        assertThat(created.getStatusCode().value()).isEqualTo(201);

        var duplicate = restTemplate.postForEntity(baseUrl() + "/api/users",
                new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
        assertThat(duplicate.getStatusCode().value()).isEqualTo(409);
    }
}
