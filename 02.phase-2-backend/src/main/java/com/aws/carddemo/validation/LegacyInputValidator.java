package com.aws.carddemo.validation;

import com.aws.carddemo.dto.AccountRequest;
import com.aws.carddemo.dto.CreditCardRequest;
import com.aws.carddemo.dto.CustomerRequest;
import com.aws.carddemo.dto.TransactionRequest;
import com.aws.carddemo.dto.UserRequest;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class LegacyInputValidator {
    private static final Pattern ACCOUNT_ID = Pattern.compile("[0-9]{11}");
    private static final Pattern CARD_NUMBER = Pattern.compile("[0-9]{16}");
    private static final Pattern TRANSACTION_ID = Pattern.compile("[0-9]{16}");
    private static final Pattern ALPHA = Pattern.compile("[A-Za-z ]+");
    private static final Pattern SIGNED_AMOUNT = Pattern.compile("[+-][0-9]{8}\\.[0-9]{2}");
    private static final Pattern PHONE = Pattern.compile("(?:\\([0-9]{3}\\)[0-9]{3}-[0-9]{4}|[0-9]{10})");
    private final Set<String> areaCodes = load("phone-area-codes.txt");
    private final Set<String> stateCodes = load("state-codes.txt");
    private final Set<String> stateZipPrefixes = load("state-zip-prefixes.txt");

    public void accountId(Object id, boolean required) {
        String value = id == null ? "" : id.toString();
        if (!required && value.isBlank()) return;
        // Path/body bindings convert zero-padded legacy IDs (e.g. 00000000001) to Long,
        // so a positive number within the 11-digit range stands for its padded form.
        if (value.matches("[0-9]{1,10}")) value = "0".repeat(11 - value.length()) + value;
        require(ACCOUNT_ID.matcher(value).matches() && !value.equals("00000000000"), "Account ID must be an 11-digit non-zero number");
    }

    public void cardNumber(String value, boolean required) {
        if (!required && blankOrZero(value)) return;
        require(value != null && CARD_NUMBER.matcher(value).matches() && !value.equals("0000000000000000"), "Card number must be a 16-digit non-zero number");
    }

    public void transactionId(String value, boolean required) {
        if (!required && blank(value)) return;
        require(value != null && TRANSACTION_ID.matcher(value).matches(), "Transaction ID must be a 16-digit number");
    }

    public int menuOption(String value, int optionCount) {
        require(value != null && value.matches("[0-9]+"), "Menu option must be numeric");
        int option = Integer.parseInt(value);
        require(option > 0 && option <= optionCount, "Menu option is outside the valid range");
        return option;
    }

    public void menuAccess(String sessionUserType, String requiredUserType) {
        require(!"U".equalsIgnoreCase(sessionUserType) || !"A".equalsIgnoreCase(requiredUserType), "No access - Admin Only option");
    }

    public void selection(String value, Set<String> validValues, boolean optional) {
        if (optional && blank(value)) return;
        require(value != null && validValues.contains(value.toUpperCase()), "Invalid selection");
    }

    public void singleSelection(long selectedCount) {
        require(selectedCount <= 1, "Only one row may be selected");
    }

    public void account(AccountRequest request) {
        yesNo(request.activeStatus(), "Account status");
        date(request.openDate(), "Open date");
        date(request.expirationDate(), "Expiration date");
        date(request.reissueDate(), "Reissue date");
        money(request.currentBalance(), "Current balance");
        money(request.creditLimit(), "Credit limit");
        money(request.cashCreditLimit(), "Cash credit limit");
        money(request.currentCycleCredit(), "Current cycle credit");
        money(request.currentCycleDebit(), "Current cycle debit");
    }

    public void customer(CustomerRequest request) {
        alphaRequired(request.firstName(), "First name");
        if (!blank(request.middleName())) alpha(request.middleName(), "Middle name");
        alphaRequired(request.lastName(), "Last name");
        require(!blank(request.addressLine1()), "Address Line 1 must be supplied");
        alphaRequired(request.addressLine3(), "City");
        alphaRequired(request.addressCountryCode(), "Country code");
        require(request.addressCountryCode().length() == 3, "Country code must contain three letters");
        state(request.addressStateCode());
        zip(request.addressZip());
        require(stateZipPrefixes.contains(request.addressStateCode().toUpperCase() + request.addressZip().substring(0, 2)), "Invalid zip code for state");
        phone(request.phoneNumber1(), "Phone number 1");
        phone(request.phoneNumber2(), "Phone number 2");
        ssn(request.ssn());
        date(request.dateOfBirth(), "Date of birth");
        require(!LocalDate.parse(request.dateOfBirth()).isAfter(LocalDate.now()), "Date of birth cannot be in the future");
        require(request.ficoCreditScore() != null && request.ficoCreditScore() >= 300 && request.ficoCreditScore() <= 850, "FICO score must be between 300 and 850");
        require(request.eftAccountId() != null && request.eftAccountId().matches("[0-9]{10}") && !request.eftAccountId().equals("0000000000"), "EFT account ID must be a 10-digit non-zero number");
        yesNo(request.primaryCardholderIndicator(), "Primary card holder");
    }

    public void card(CreditCardRequest request) {
        accountId(request.accountId(), true);
        alphaRequired(request.embossedName(), "Embossed name");
        yesNo(request.activeStatus(), "Card active status");
        date(request.expirationDate(), "Card expiration date");
        int year = LocalDate.parse(request.expirationDate()).getYear();
        require(year >= 1950 && year <= 2099, "Card expiry year must be between 1950 and 2099");
    }

    public void transaction(TransactionRequest request) {
        transactionId(request.id(), true);
        require(request.accountId() != null || !blank(request.cardNumber()), "Account or Card Number must be entered");
        if (request.accountId() != null) accountId(request.accountId(), true);
        if (!blank(request.cardNumber())) cardNumber(request.cardNumber(), true);
        require(request.transactionTypeCode().matches("[0-9]{2}"), "Type code must be numeric");
        require(request.transactionCategoryCode() >= 0 && request.transactionCategoryCode() <= 9999, "Category code must be numeric and at most four digits");
        require(SIGNED_AMOUNT.matcher(request.amount()).matches(), "Amount must use format -99999999.99");
        transactionDate(request.originationTimestamp(), "Origination date");
        transactionDate(request.processingTimestamp(), "Processing date");
        require(request.merchantId().matches("[0-9]{9}"), "Merchant ID must be numeric");
        confirmation(request.confirmation());
    }

    public void userId(String id) {
        require(id != null && !id.isBlank() && id.length() <= 8, "User ID is required and must not exceed 8 characters");
    }

    public void user(UserRequest request, boolean passwordRequired) {
        // Names accept punctuation (e.g. O'Brien, Smith-Jones); only nonblank and length are enforced.
        require(!blank(request.firstName()), "First name must be supplied");
        require(!blank(request.lastName()), "Last name must be supplied");
        if (passwordRequired) require(!blank(request.password()), "Password is required");
        require("A".equalsIgnoreCase(request.userType()) || "U".equalsIgnoreCase(request.userType()), "User type must be A or U");
    }

    public void confirmation(String value) {
        require(value != null && (value.equalsIgnoreCase("Y") || value.equalsIgnoreCase("N")), "Confirmation must be Y or N");
        require(value.equalsIgnoreCase("Y"), "The operation was not confirmed");
    }

    public LocalDate date(String value, String field) {
        require(!blank(value), field + " must be supplied");
        try { return LocalDate.parse(value); }
        catch (DateTimeParseException exception) { throw new IllegalArgumentException(field + " must be a real date in YYYY-MM-DD format"); }
    }

    private void transactionDate(String timestamp, String field) {
        require(timestamp != null && timestamp.length() >= 10, field + " must be supplied");
        date(timestamp.substring(0, 10), field);
    }

    private void state(String value) {
        alphaRequired(value, "State");
        require(value.length() == 2 && stateCodes.contains(value.toUpperCase()), "State is not a valid state code");
    }

    private void zip(String value) {
        require(value != null && value.matches("[0-9]{5}") && !value.equals("00000"), "Zip must be a five-digit non-zero number");
    }

    private void ssn(String value) {
        require(value != null && value.matches("[0-9]{9}"), "SSN must contain nine digits");
        int first = Integer.parseInt(value.substring(0, 3));
        int middle = Integer.parseInt(value.substring(3, 5));
        int last = Integer.parseInt(value.substring(5));
        require(first != 0 && first != 666 && first < 900, "SSN first segment is invalid");
        require(middle != 0, "SSN middle segment must be non-zero");
        require(last != 0, "SSN last segment must be non-zero");
    }

    private void phone(String value, String field) {
        if (blank(value)) return;
        require(PHONE.matcher(value).matches(), field + " must be a complete US phone number");
        String digits = value.replaceAll("[^0-9]", "");
        require(!digits.substring(0, 3).equals("000") && areaCodes.contains(digits.substring(0, 3)), "Not valid North America general purpose area code");
        require(!digits.substring(3, 6).equals("000"), "Phone prefix must be non-zero");
        require(!digits.substring(6).equals("0000"), "Phone line number must be non-zero");
    }

    private void yesNo(String value, String field) { require(value != null && (value.equalsIgnoreCase("Y") || value.equalsIgnoreCase("N")), field + " must be Y or N"); }
    private void alphaRequired(String value, String field) { require(!blank(value), field + " must be supplied"); alpha(value, field); }
    private void alpha(String value, String field) { require(ALPHA.matcher(value).matches(), field + " can have alphabets and spaces only"); }
    private void money(BigDecimal value, String field) { require(value != null && value.scale() <= 2, field + " must be a valid signed amount with at most two decimals"); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private boolean blankOrZero(String value) { return blank(value) || value.chars().allMatch(character -> character == '0'); }
    private void require(boolean condition, String message) { if (!condition) throw new IllegalArgumentException(message); }

    private Set<String> load(String fileName) {
        try (var stream = getClass().getResourceAsStream("/validation/" + fileName)) {
            if (stream == null) throw new IllegalStateException("Missing validation resource: " + fileName);
            try (var reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                return reader.lines().filter(line -> !line.isBlank()).collect(Collectors.toUnmodifiableSet());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot load validation resource: " + fileName, exception);
        }
    }
}
