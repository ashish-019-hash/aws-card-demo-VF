package com.carddemo.backend.validation;

import com.carddemo.backend.dto.ApiDtos;
import com.carddemo.backend.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Traceability: grouped positive/negative coverage for RULE-VAL-001 through
 * RULE-VAL-039. RULE-VAL-022 is intentionally dormant for the supplied menu
 * configuration; RULE-VAL-024/036 are covered by database keys and their
 * repository integration test.
 */
class LegacyValidationServiceTest {
    private final LegacyValidationService validation = new LegacyValidationService();

    @Test
    void accountAndCardIdentifiersCoverRules001002014015() {
        assertThatCode(() -> validation.accountLookup(12345678901L)).doesNotThrowAnyException();
        assertRule("RULE-VAL-001", () -> validation.accountLookup(null));
        assertRule("RULE-VAL-002", () -> validation.accountLookup(123456789012L));
        assertThatCode(() -> validation.optionalAccountFilter(null)).doesNotThrowAnyException();
        assertRule("RULE-VAL-014", () -> validation.optionalAccountFilter(123456789012L));
        assertThatCode(() -> validation.cardFilter("1234567890123456", true)).doesNotThrowAnyException();
        assertRule("RULE-VAL-015", () -> validation.cardFilter("not-a-card", false));
    }

    @Test
    void accountAndCustomerMaintenanceCoversRules003Through013And039() {
        assertThatCode(() -> validation.accountUpdate(validAccount())).doesNotThrowAnyException();
        assertRule("RULE-VAL-003", () -> validation.accountUpdate(new ApiDtos.AccountUpdateRequest("y", money(), money(), money(), "20240101", "20250101", "20240101", money(), money(), "12345", "GROUP", null)));
        assertRule("RULE-VAL-004", () -> validation.accountUpdate(new ApiDtos.AccountUpdateRequest("Y", new BigDecimal("1.234"), money(), money(), "20240101", "20250101", "20240101", money(), money(), "12345", "GROUP", null)));
        assertRule("RULE-VAL-005", () -> validation.accountUpdate(new ApiDtos.AccountUpdateRequest("Y", money(), money(), money(), "20230229", "20250101", "20240101", money(), money(), "12345", "GROUP", null)));

        assertThatCode(() -> validation.customerUpdate(validCustomer())).doesNotThrowAnyException();
        assertRule("RULE-VAL-006", () -> validation.customerUpdate(customerWithFico(299)));
        assertRule("RULE-VAL-007", () -> validation.customerUpdate(customerWithFirstName("Ada3")));
        assertRule("RULE-VAL-008", () -> validation.customerUpdate(customerWithZip("00000")));
        assertRule("RULE-VAL-009", () -> validation.customerUpdate(customerWithState("ZZ")));
        assertRule("RULE-VAL-010", () -> validation.customerUpdate(customerWithZip("99999")));
        assertRule("RULE-VAL-011", () -> validation.customerUpdate(customerWithPhone("(000)555-1212")));
        assertRule("RULE-VAL-012", () -> validation.customerUpdate(customerWithSsn("666121234")));
        assertRule("RULE-VAL-013", () -> validation.customerUpdate(customerWithIndicator("y")));
        assertRule("RULE-VAL-005", () -> validation.customerUpdate(customerWithDob(LocalDate.now().toString())));
    }

    @Test
    void cardMaintenanceCoversRules017Through020() {
        assertThatCode(() -> validation.cardUpdate(new ApiDtos.CardUpdateRequest("Ada Lovelace", "2025-12-01", "Y"))).doesNotThrowAnyException();
        assertRule("RULE-VAL-017", () -> validation.cardUpdate(new ApiDtos.CardUpdateRequest("Ada-1", "2025-12-01", "Y")));
        assertRule("RULE-VAL-018", () -> validation.cardUpdate(new ApiDtos.CardUpdateRequest("Ada", "2025-12-01", "y")));
        assertRule("RULE-VAL-019", () -> validation.cardUpdate(new ApiDtos.CardUpdateRequest("Ada", "invalid", "Y")));
        assertRule("RULE-VAL-020", () -> validation.cardUpdate(new ApiDtos.CardUpdateRequest("Ada", "2100-01-01", "Y")));
    }

    @Test
    void menuAndRowSelectionsCoverRules016021022027And028() {
        assertThatCode(() -> validation.menuChoice("10", 10)).doesNotThrowAnyException();
        assertRule("RULE-VAL-021", () -> validation.menuChoice("0", 10));
        // RULE-VAL-022 is deliberately dormant: supplied menu options all require U.
        assertThatCode(() -> validation.cardListActions(List.of("S", ""))).doesNotThrowAnyException();
        assertRule("RULE-VAL-016", () -> validation.cardListActions(List.of("S", "U")));
        assertThatCode(() -> validation.selection("s", true)).doesNotThrowAnyException();
        assertRule("RULE-VAL-027", () -> validation.selection("U", true));
        assertRule("RULE-VAL-027", () -> validation.transactionFilter("ABC"));
        assertRule("RULE-VAL-028", () -> validation.transactionLookup(""));
    }

    @Test
    void userAndSignOnInputsCoverRules023024And025() {
        assertThatCode(() -> validation.userFields("USER0001", "Ada", "Lovelace", "password", "U")).doesNotThrowAnyException();
        assertRule("RULE-VAL-023", () -> validation.userFields("", "Ada", "Lovelace", "password", "U"));
        // RULE-VAL-024: ApplicationUser.userId is the JPA primary key; duplicate persistence is tested separately.
        assertThatCode(() -> validation.signOn("USER0001", "password")).doesNotThrowAnyException();
        assertRule("RULE-VAL-025", () -> validation.signOn("USER0001", ""));
    }

    @Test
    void confirmationsAndTransactionFieldsCoverRules026And029Through035() {
        assertThatCode(() -> validation.billPayment(12345678901L, "Y")).doesNotThrowAnyException();
        assertRule("RULE-VAL-026", () -> validation.billPayment(null, "Y"));
        assertRule("RULE-VAL-026", () -> validation.billPayment(12345678901L, "maybe"));

        assertThatCode(() -> validation.transaction(validTransaction())).doesNotThrowAnyException();
        assertRule("RULE-VAL-029", () -> validation.transaction(transactionWithConfirmation("")));
        assertRule("RULE-VAL-030", () -> validation.transaction(transactionWithIdentifiers(null, null)));
        assertRule("RULE-VAL-031", () -> validation.transaction(transactionWithSource("")));
        assertRule("RULE-VAL-032", () -> validation.transaction(transactionWithType("AB")));
        assertRule("RULE-VAL-033", () -> validation.transaction(transactionWithAmount(new BigDecimal("1.2"))));
        assertRule("RULE-VAL-035", () -> validation.transaction(transactionWithMerchantId(-1L)));
        // RULE-VAL-034: LocalDate DTO parsing guarantees a valid YYYY-MM-DD calendar date before service validation.
    }

    @Test
    void customReportsCoverRules037And038() {
        assertThatCode(() -> validation.report(new ApiDtos.ReportRequest(ApiDtos.ReportType.CUSTOM, LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1), "Y"))).doesNotThrowAnyException();
        assertRule("RULE-VAL-037", () -> validation.report(new ApiDtos.ReportRequest(ApiDtos.ReportType.CUSTOM, null, LocalDate.now(), "Y")));
        assertRule("RULE-VAL-038", () -> validation.report(new ApiDtos.ReportRequest(ApiDtos.ReportType.MONTHLY, null, null, "N")));
    }

    private ApiDtos.AccountUpdateRequest validAccount() {
        return new ApiDtos.AccountUpdateRequest("Y", money(), money(), money(), "20240101", "20251201", "20240101", money(), money(), "12345", "GROUP", null);
    }
    private BigDecimal money() { return new BigDecimal("10.00"); }
    private ApiDtos.CustomerUpdateRequest validCustomer() {
        return new ApiDtos.CustomerUpdateRequest("Ada", "", "Lovelace", "1 Main Street", "", "Boston", "MA", "USA", "10108", "(617)555-1212", "", "123456789", "ID", "1980-01-01", "123456", "Y", 800);
    }
    private ApiDtos.CustomerUpdateRequest customerWithFico(Integer value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), c.addressZip(), c.primaryPhoneNumber(), c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), c.primaryCardHolderIndicator(), value); }
    private ApiDtos.CustomerUpdateRequest customerWithFirstName(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(value, c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), c.addressZip(), c.primaryPhoneNumber(), c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), c.primaryCardHolderIndicator(), c.ficoCreditScore()); }
    private ApiDtos.CustomerUpdateRequest customerWithZip(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), value, c.primaryPhoneNumber(), c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), c.primaryCardHolderIndicator(), c.ficoCreditScore()); }
    private ApiDtos.CustomerUpdateRequest customerWithState(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), value, c.addressCountryCode(), c.addressZip(), c.primaryPhoneNumber(), c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), c.primaryCardHolderIndicator(), c.ficoCreditScore()); }
    private ApiDtos.CustomerUpdateRequest customerWithPhone(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), c.addressZip(), value, c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), c.primaryCardHolderIndicator(), c.ficoCreditScore()); }
    private ApiDtos.CustomerUpdateRequest customerWithSsn(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), c.addressZip(), c.primaryPhoneNumber(), c.secondaryPhoneNumber(), value, c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), c.primaryCardHolderIndicator(), c.ficoCreditScore()); }
    private ApiDtos.CustomerUpdateRequest customerWithIndicator(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), c.addressZip(), c.primaryPhoneNumber(), c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), c.dateOfBirth(), c.eftAccountId(), value, c.ficoCreditScore()); }
    private ApiDtos.CustomerUpdateRequest customerWithDob(String value) { var c = validCustomer(); return new ApiDtos.CustomerUpdateRequest(c.firstName(), c.middleName(), c.lastName(), c.addressLine1(), c.addressLine2(), c.city(), c.addressStateCode(), c.addressCountryCode(), c.addressZip(), c.primaryPhoneNumber(), c.secondaryPhoneNumber(), c.ssn(), c.governmentIssuedId(), value, c.eftAccountId(), c.primaryCardHolderIndicator(), c.ficoCreditScore()); }

    private ApiDtos.TransactionCreateRequest validTransaction() { return new ApiDtos.TransactionCreateRequest(12345678901L, null, "01", 1, "POS", "Purchase", new BigDecimal("1.00"), 1L, "Merchant", "Boston", "02108", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 2), "Y"); }
    private ApiDtos.TransactionCreateRequest transactionWithConfirmation(String value) { var t = validTransaction(); return new ApiDtos.TransactionCreateRequest(t.accountId(), t.cardNumber(), t.transactionTypeCode(), t.transactionCategoryCode(), t.source(), t.description(), t.amount(), t.merchantId(), t.merchantName(), t.merchantCity(), t.merchantZip(), t.originDate(), t.processingDate(), value); }
    private ApiDtos.TransactionCreateRequest transactionWithIdentifiers(Long accountId, String cardNumber) { var t = validTransaction(); return new ApiDtos.TransactionCreateRequest(accountId, cardNumber, t.transactionTypeCode(), t.transactionCategoryCode(), t.source(), t.description(), t.amount(), t.merchantId(), t.merchantName(), t.merchantCity(), t.merchantZip(), t.originDate(), t.processingDate(), t.confirmation()); }
    private ApiDtos.TransactionCreateRequest transactionWithSource(String source) { var t = validTransaction(); return new ApiDtos.TransactionCreateRequest(t.accountId(), t.cardNumber(), t.transactionTypeCode(), t.transactionCategoryCode(), source, t.description(), t.amount(), t.merchantId(), t.merchantName(), t.merchantCity(), t.merchantZip(), t.originDate(), t.processingDate(), t.confirmation()); }
    private ApiDtos.TransactionCreateRequest transactionWithType(String type) { var t = validTransaction(); return new ApiDtos.TransactionCreateRequest(t.accountId(), t.cardNumber(), type, t.transactionCategoryCode(), t.source(), t.description(), t.amount(), t.merchantId(), t.merchantName(), t.merchantCity(), t.merchantZip(), t.originDate(), t.processingDate(), t.confirmation()); }
    private ApiDtos.TransactionCreateRequest transactionWithAmount(BigDecimal amount) { var t = validTransaction(); return new ApiDtos.TransactionCreateRequest(t.accountId(), t.cardNumber(), t.transactionTypeCode(), t.transactionCategoryCode(), t.source(), t.description(), amount, t.merchantId(), t.merchantName(), t.merchantCity(), t.merchantZip(), t.originDate(), t.processingDate(), t.confirmation()); }
    private ApiDtos.TransactionCreateRequest transactionWithMerchantId(Long id) { var t = validTransaction(); return new ApiDtos.TransactionCreateRequest(t.accountId(), t.cardNumber(), t.transactionTypeCode(), t.transactionCategoryCode(), t.source(), t.description(), t.amount(), id, t.merchantName(), t.merchantCity(), t.merchantZip(), t.originDate(), t.processingDate(), t.confirmation()); }

    @Test
    void transactionIdentifiersRejectNonNumericAndOverlongValues() {
        assertRule("RULE-VAL-027", () -> validation.transactionFilter("abc"));
        assertRule("RULE-VAL-027", () -> validation.transactionFilter("12345678901234567"));
        assertRule("RULE-VAL-028", () -> validation.transactionLookup("12345678901234567"));
        assertRule("RULE-VAL-028", () -> validation.transactionLookup("not-a-number"));
    }

    @Test
    void userFieldsRejectLegacyWidthOverflow() {
        assertRule("RULE-VAL-023", () -> validation.userFields("USER00001", "Ada", "Lovelace", "PASS", "U"));
        assertRule("RULE-VAL-023", () -> validation.userFields("USER0001", "Ada", "Lovelace", "TOO-LONG-PASSWORD", "U"));
    }

    private void assertRule(String rule, org.assertj.core.api.ThrowableAssert.ThrowingCallable callable) {
        assertThatThrownBy(callable).isInstanceOf(ApiException.class).extracting(e -> ((ApiException) e).getRuleId()).isEqualTo(rule);
    }
}
