package com.carddemo.backend.integration;

import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.entity.TransactionCategory;
import com.carddemo.backend.entity.TransactionCategoryId;
import com.carddemo.backend.entity.TransactionType;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.ApplicationUserRepository;
import com.carddemo.backend.repository.CardRepository;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.CustomerRepository;
import com.carddemo.backend.repository.TransactionCategoryRepository;
import com.carddemo.backend.repository.TransactionTypeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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

    @Autowired
    private TransactionTypeRepository transactionTypeRepository;

    @Autowired
    private TransactionCategoryRepository transactionCategoryRepository;

    @BeforeEach
    void seedFixtures() {
        ensureTransactionReferenceData();
        ensureUser(ADMIN_ID, "A");
        ensureUser(REGULAR_ID, "U");
        ensureAccountFixture();
    }

    /**
     * V2 migration added FK constraints from transactions to transaction_types/
     * transaction_categories. In "dev", {@code SeedDataLoader} (profile-gated) loads these
     * master/reference tables from seed-data/trantype.txt and trancatg.txt; under the
     * "test" profile that loader never runs (carddemo.seed.enabled=false), so this fixture
     * inserts just the one type/category combo ("02"/2) the transaction-add and
     * bill-payment tests below actually write.
     */
    private void ensureTransactionReferenceData() {
        if (!transactionTypeRepository.existsById("02")) {
            TransactionType type = new TransactionType();
            type.setTypeCd("02");
            type.setTypeDesc("PURCHASE");
            transactionTypeRepository.save(type);
        }
        TransactionCategoryId catId = new TransactionCategoryId("02", 2);
        if (!transactionCategoryRepository.existsById(catId)) {
            TransactionCategory category = new TransactionCategory();
            category.setId(catId);
            category.setCatTypeDesc("REGULAR SALES DRAFT");
            transactionCategoryRepository.save(category);
        }
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

    /**
     * BR-007/BR-008: {@code findByIdForUpdate} takes a {@code PESSIMISTIC_WRITE} lock, so
     * two genuinely concurrent PUTs against the same account must serialize: exactly one
     * sees its {@code expected} snapshot still match the live row (200, changed:true) and
     * the other sees the row changed out from under it (409 DATA_CHANGED) — proving the
     * conflict check is race-safe, not just correct for two sequential calls.
     */
    @Test
    void updateAccount_concurrentUpdatesOnlyOneSucceedsOtherGetsDataChangedConflict() throws Exception {
        Long acctId = 100000000004L;
        seedAccount(acctId, 900000004L, "4444444444444444", new BigDecimal("10.00"));

        Session session = login(REGULAR_ID);
        var getResponse = restTemplate.exchange(baseUrl() + "/api/accounts/" + acctId,
                org.springframework.http.HttpMethod.GET, new org.springframework.http.HttpEntity<>(session.headers()),
                String.class);
        assertThat(getResponse.getStatusCode().value()).isEqualTo(200);
        JsonNode fields = objectMapper.readTree(getResponse.getBody()).get("fields");

        ObjectNode updatedA = fields.deepCopy();
        updatedA.put("lastName", "WINNERA");
        ObjectNode updatedB = fields.deepCopy();
        updatedB.put("lastName", "WINNERB");
        String bodyA = "{\"expected\":" + fields + ",\"updated\":" + updatedA + "}";
        String bodyB = "{\"expected\":" + fields + ",\"updated\":" + updatedB + "}";

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            CyclicBarrier barrier = new CyclicBarrier(2);
            Callable<org.springframework.http.ResponseEntity<String>> callA = () -> {
                barrier.await();
                return restTemplate.exchange(baseUrl() + "/api/accounts/" + acctId,
                        org.springframework.http.HttpMethod.PUT,
                        new org.springframework.http.HttpEntity<>(bodyA, session.headers()), String.class);
            };
            Callable<org.springframework.http.ResponseEntity<String>> callB = () -> {
                barrier.await();
                return restTemplate.exchange(baseUrl() + "/api/accounts/" + acctId,
                        org.springframework.http.HttpMethod.PUT,
                        new org.springframework.http.HttpEntity<>(bodyB, session.headers()), String.class);
            };
            Future<org.springframework.http.ResponseEntity<String>> futureA = executor.submit(callA);
            Future<org.springframework.http.ResponseEntity<String>> futureB = executor.submit(callB);
            var responseA = futureA.get(10, TimeUnit.SECONDS);
            var responseB = futureB.get(10, TimeUnit.SECONDS);

            List<Integer> statuses = List.of(responseA.getStatusCode().value(), responseB.getStatusCode().value());
            assertThat(statuses).containsExactlyInAnyOrder(200, 409);
            String conflictBody = responseA.getStatusCode().value() == 409 ? responseA.getBody() : responseB.getBody();
            assertThat(conflictBody).contains("DATA_CHANGED");
        } finally {
            executor.shutdownNow();
        }
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

    /**
     * BR-010: {@code TranIdAllocatorRepository.lockRow()} takes a
     * {@code PESSIMISTIC_WRITE} lock, so truly concurrent allocations must still serialize
     * and never hand out the same id twice, even under a genuine race (not just two
     * sequential calls on the same thread as in the test above).
     */
    @Test
    void addTransaction_concurrentRequestsAllocateDistinctIds() throws Exception {
        Session session = login(REGULAR_ID);
        String body = transactionAddBody();
        int concurrency = 10;
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        try {
            CyclicBarrier barrier = new CyclicBarrier(concurrency);
            List<Future<String>> futures = new java.util.ArrayList<>();
            for (int i = 0; i < concurrency; i++) {
                futures.add(executor.submit(() -> {
                    barrier.await();
                    var response = restTemplate.postForEntity(baseUrl() + "/api/transactions",
                            new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
                    assertThat(response.getStatusCode().value()).isEqualTo(200);
                    return objectMapper.readTree(response.getBody()).get("tranId").asText();
                }));
            }
            Set<String> tranIds = new HashSet<>();
            for (Future<String> future : futures) {
                tranIds.add(future.get(10, TimeUnit.SECONDS));
            }
            assertThat(tranIds).hasSize(concurrency);
        } finally {
            executor.shutdownNow();
        }
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
        c.setEftAccountId("1234567890");
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

    /**
     * BR-016: the {@code existsById} pre-check in {@code UserAdminService.create()} is not
     * itself race-safe, so two genuinely concurrent creates for the same user id must be
     * caught by the {@code saveAndFlush}/{@code DataIntegrityViolationException} fallback
     * against the {@code users_pkey} unique constraint. Exactly one request must succeed
     * (201) and the other must get 409 CONFLICT — never both 201, and never both 409.
     */
    @Test
    void userAdmin_concurrentDuplicateCreateOnlyOneSucceeds() throws Exception {
        Session session = login(ADMIN_ID);
        String body = "{\"userId\":\"RACEUSR1\",\"firstName\":\"A\",\"lastName\":\"B\","
                + "\"password\":\"PASSWORD\",\"userType\":\"U\"}";

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            CyclicBarrier barrier = new CyclicBarrier(2);
            Callable<org.springframework.http.ResponseEntity<String>> call = () -> {
                barrier.await();
                return restTemplate.postForEntity(baseUrl() + "/api/users",
                        new org.springframework.http.HttpEntity<>(body, session.headers()), String.class);
            };
            Future<org.springframework.http.ResponseEntity<String>> future1 = executor.submit(call);
            Future<org.springframework.http.ResponseEntity<String>> future2 = executor.submit(call);
            var response1 = future1.get(10, TimeUnit.SECONDS);
            var response2 = future2.get(10, TimeUnit.SECONDS);

            List<Integer> statuses = List.of(response1.getStatusCode().value(), response2.getStatusCode().value());
            assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        } finally {
            executor.shutdownNow();
        }
    }
}
