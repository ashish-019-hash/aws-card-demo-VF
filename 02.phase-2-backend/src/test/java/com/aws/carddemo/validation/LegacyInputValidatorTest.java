package com.aws.carddemo.validation;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aws.carddemo.dto.AccountRequest;
import com.aws.carddemo.dto.CreditCardRequest;
import com.aws.carddemo.dto.CustomerRequest;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.dto.UserRequest;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LegacyInputValidatorTest {
    private final LegacyInputValidator validator = new LegacyInputValidator();

    @Test
    void validatesSharedKeysMenusAndSelections() {
        assertThatCode(() -> validator.accountId(12345678901L, true)).doesNotThrowAnyException();
        // Long bindings strip legacy zero padding: 1L stands for 00000000001.
        assertThatCode(() -> validator.accountId(1L, true)).doesNotThrowAnyException();
        assertThatCode(() -> validator.cardNumber("1111222233334444", true)).doesNotThrowAnyException();
        assertThatCode(() -> validator.transactionId("0000000000000001", true)).doesNotThrowAnyException();
        assertThatCode(() -> validator.menuOption("10", 10)).doesNotThrowAnyException();
        assertThatCode(() -> validator.selection("s", Set.of("S", "U"), false)).doesNotThrowAnyException();
        assertThatCode(() -> validator.singleSelection(1)).doesNotThrowAnyException();
        assertThatThrownBy(() -> validator.accountId(0L, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.accountId(-1L, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.accountId(123456789012L, true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.menuAccess("U", "A")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.singleSelection(2)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validatesAccountFieldsAndRealDates() {
        AccountRequest valid = new AccountRequest(0L, "Y", money("1.00"), money("2.00"), money("1.00"),
                "2020-01-01", "2030-12-31", "2029-12-31", money("0.00"), money("1.00"), "10001", "G1");
        assertThatCode(() -> validator.account(valid)).doesNotThrowAnyException();
        AccountRequest invalid = new AccountRequest(0L, "X", money("1.00"), money("2.00"), money("1.00"),
                "2020-02-30", "2030-12-31", "2029-12-31", money("0.00"), money("1.00"), "10001", "G1");
        assertThatThrownBy(() -> validator.account(invalid)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validatesCustomerCrossFieldAndLookupRules() {
        CustomerRequest valid = validCustomer("NY", "10001", "2125550100", "123456789", 700);
        assertThatCode(() -> validator.customer(valid)).doesNotThrowAnyException();
        assertThatThrownBy(() -> validator.customer(validCustomer("NY", "90001", "2125550100", "123456789", 700)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("zip code for state");
        assertThatThrownBy(() -> validator.customer(validCustomer("NY", "10001", "0005550100", "123456789", 700)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.customer(validCustomer("NY", "10001", "2125550100", "666456789", 700)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.customer(validCustomer("NY", "10001", "2125550100", "123456789", 299)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validatesCardAndTransactionData() {
        CreditCardRequest card = new CreditCardRequest(0L, 12345678901L, 123, "A USER", "2030-12-01", "Y");
        assertThatCode(() -> validator.card(card)).doesNotThrowAnyException();

        TransactionRequest transaction = new TransactionRequest("0000000000000001", null, "01", 1,
                "POS TERM", "Purchase", "+00000001.00", "000000001", "Merchant", "City", "10001",
                "1111222233334444", "2024-01-01", "2024-01-02", "Y");
        assertThatCode(() -> validator.transaction(transaction)).doesNotThrowAnyException();
        TransactionRequest invalidAmount = new TransactionRequest("0000000000000001", null, "01", 1,
                "POS TERM", "Purchase", "1.00", "000000001", "Merchant", "City", "10001",
                "1111222233334444", "2024-01-01", "2024-01-02", "Y");
        assertThatThrownBy(() -> validator.transaction(invalidAmount)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void validatesUserAndConfirmationRules() {
        assertThatCode(() -> validator.userId("USER0001")).doesNotThrowAnyException();
        assertThatCode(() -> validator.user(new UserRequest("A", "User", "password", "U"), true)).doesNotThrowAnyException();
        assertThatCode(() -> validator.user(new UserRequest("Mary-Jane", "O'Brien Jr.", "password", "U"), true))
                .doesNotThrowAnyException();
        assertThatCode(() -> validator.confirmation("Y")).doesNotThrowAnyException();
        assertThatThrownBy(() -> validator.user(new UserRequest(" ", "User", "password", "U"), true))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.user(new UserRequest("A", " ", "password", "U"), true))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> validator.confirmation("N")).isInstanceOf(IllegalArgumentException.class);
    }

    private CustomerRequest validCustomer(String state, String zip, String phone, String ssn, Integer fico) {
        return new CustomerRequest(0L, "Alice", "", "User", "1 Main Street", "", "New York", state, "USA", zip,
                phone, "", ssn, "ID123", "2000-01-01", "1234567890", "Y", fico);
    }

    private BigDecimal money(String value) { return new BigDecimal(value); }
}
