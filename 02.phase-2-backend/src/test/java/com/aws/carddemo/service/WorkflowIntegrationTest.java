package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.aws.carddemo.dto.BillPaymentRequest;
import com.aws.carddemo.dto.BillPaymentResponse;
import com.aws.carddemo.dto.ReportRequest;
import com.aws.carddemo.dto.ReportResponse;
import com.aws.carddemo.entity.Account;
import com.aws.carddemo.entity.ApplicationUser;
import com.aws.carddemo.entity.CardCrossReference;
import com.aws.carddemo.entity.CreditCard;
import com.aws.carddemo.entity.Customer;
import com.aws.carddemo.entity.TransactionCategory;
import com.aws.carddemo.entity.TransactionCategoryId;
import com.aws.carddemo.entity.TransactionType;
import com.aws.carddemo.repository.AccountRepository;
import com.aws.carddemo.repository.ApplicationUserRepository;
import com.aws.carddemo.repository.CardCrossReferenceRepository;
import com.aws.carddemo.repository.CreditCardRepository;
import com.aws.carddemo.repository.CustomerRepository;
import com.aws.carddemo.repository.TransactionCategoryRepository;
import com.aws.carddemo.repository.TransactionTypeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WorkflowIntegrationTest {
    private static final long ACCOUNT_ID = 12345678901L;
    private static final long CUSTOMER_ID = 123456789L;
    private static final String CARD_NUMBER = "1111222233334444";

    @Autowired BillPaymentWorkflowService billPayments;
    @Autowired ReportWorkflowService reports;
    @Autowired AccountRepository accounts;
    @Autowired CustomerRepository customers;
    @Autowired CreditCardRepository cards;
    @Autowired CardCrossReferenceRepository crossReferences;
    @Autowired TransactionTypeRepository types;
    @Autowired TransactionCategoryRepository categories;
    @Autowired ApplicationUserRepository users;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired MockMvc mvc;

    @BeforeEach
    void seedWorkflowData() {
        TransactionType type = new TransactionType(); type.setCode("02"); type.setDescription("Payment"); types.save(type);
        TransactionCategoryId categoryId = new TransactionCategoryId(); categoryId.setTransactionTypeCode("02"); categoryId.setTransactionCategoryCode(2);
        TransactionCategory category = new TransactionCategory(); category.setId(categoryId); category.setDescription("Bill payment"); categories.save(category);

        Account account = new Account(); account.setId(ACCOUNT_ID); account.setActiveStatus("Y"); account.setCurrentBalance(new BigDecimal("125.75"));
        account.setCreditLimit(new BigDecimal("1000.00")); account.setCashCreditLimit(new BigDecimal("100.00")); accounts.save(account);
        Customer customer = new Customer(); customer.setId(CUSTOMER_ID); customer.setFirstName("Alice"); customer.setLastName("User"); customers.save(customer);
        CreditCard card = new CreditCard(); card.setCardNumber(CARD_NUMBER); card.setAccountId(ACCOUNT_ID); card.setActiveStatus("Y"); cards.save(card);
        CardCrossReference reference = new CardCrossReference(); reference.setCardNumber(CARD_NUMBER); reference.setAccountId(ACCOUNT_ID); reference.setCustomerId(CUSTOMER_ID); crossReferences.save(reference);

        ApplicationUser admin = new ApplicationUser(); admin.setId("ADMIN001"); admin.setFirstName("Admin"); admin.setLastName("User");
        admin.setPasswordHash(passwordEncoder.encode("PASSWORD")); admin.setUserType("A"); users.save(admin);
        ApplicationUser regular = new ApplicationUser(); regular.setId("USER0001"); regular.setFirstName("Regular"); regular.setLastName("User");
        regular.setPasswordHash(passwordEncoder.encode("PASSWORD")); regular.setUserType("U"); users.save(regular);
    }

    @Test
    void billPaymentAndReportCompleteAsOneTransactionalWorkflow() {
        BillPaymentResponse payment = billPayments.pay(new BillPaymentRequest(ACCOUNT_ID, "Y"));
        assertThat(payment.amount()).isEqualByComparingTo("125.75");
        assertThat(accounts.findById(ACCOUNT_ID).orElseThrow().getCurrentBalance()).isEqualByComparingTo("0.00");

        LocalDate today = LocalDate.now();
        ReportResponse report = reports.generate(new ReportRequest(ReportRequest.ReportType.CUSTOM, today, today, "Y"));
        assertThat(report.transactions()).extracting(transaction -> transaction.id()).containsExactly(payment.transactionId());
        assertThat(report.formatterStatus()).contains("CBTRN03C formatter source is absent");
    }

    @Test
    void loginCreatesAnAdminSessionAndRejectsWrongCredentials() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"admin001\",\"password\":\"PASSWORD\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userType").value("A"))
                .andExpect(jsonPath("$.entryPoint").value("ADMIN_MENU"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"ADMIN001\",\"password\":\"wrongpass\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void securityEnforcesAuthenticationRolesAndCsrf() throws Exception {
        MvcResult adminLogin = login("ADMIN001");
        MvcResult userLogin = login("USER0001");
        MockHttpSession adminSession = (MockHttpSession) adminLogin.getRequest().getSession(false);
        MockHttpSession userSession = (MockHttpSession) userLogin.getRequest().getSession(false);

        mvc.perform(get("/api/accounts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users").session(userSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/users").session(adminSession)).andExpect(status().isOk());
        mvc.perform(post("/api/bill-payments").session(adminSession).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":12345678901,\"confirmation\":\"Y\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/bill-payments").session(adminSession).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":12345678901,\"confirmation\":\"Y\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultingBalance").value(0));
    }

    private MvcResult login(String userId) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + userId + "\",\"password\":\"PASSWORD\"}"))
                .andExpect(status().isOk()).andReturn();
    }
}
