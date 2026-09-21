package com.carddemo.backend.service;

import com.carddemo.backend.dto.AccountFields;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/** BR-006/BR-007 field comparison semantics (COACTUPC.cbl:1681-1775/4109-4195). */
class AccountFieldsComparatorTest {

    private AccountFields fields(String activeStatus, BigDecimal creditLimit, String firstName, String openDate) {
        return new AccountFields(activeStatus, creditLimit, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, openDate, "2030-01-01", "2020-01-01", "GRP01", firstName, "M", "DOE",
                "1 MAIN ST", "", "CITY", "NC", "USA", "27601", "", "", "123456789", "GOVID", "1980-01-01",
                "1", "Y", 700);
    }

    @Test
    void identicalFieldsAreEqual() {
        AccountFields a = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        AccountFields b = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        assertThat(AccountFieldsComparator.equal(a, b)).isTrue();
    }

    @Test
    void activeStatusComparisonIsCaseInsensitive() {
        AccountFields a = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        AccountFields b = fields("y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        assertThat(AccountFieldsComparator.equal(a, b)).isTrue();
    }

    @Test
    void creditLimitComparisonIgnoresScale() {
        AccountFields a = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        AccountFields b = fields("Y", new BigDecimal("100.0"), "JOHN", "2020-01-01");
        assertThat(AccountFieldsComparator.equal(a, b)).isTrue();
    }

    @Test
    void firstNameComparisonIsTrimmedAndCaseInsensitive() {
        AccountFields a = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        AccountFields b = fields("Y", new BigDecimal("100.00"), " john ", "2020-01-01");
        assertThat(AccountFieldsComparator.equal(a, b)).isTrue();
    }

    @Test
    void differentBalanceIsNotEqual() {
        AccountFields a = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        AccountFields b = fields("Y", new BigDecimal("200.00"), "JOHN", "2020-01-01");
        assertThat(AccountFieldsComparator.equal(a, b)).isFalse();
    }

    @Test
    void differentOpenDateIsNotEqual() {
        AccountFields a = fields("Y", new BigDecimal("100.00"), "JOHN", "2020-01-01");
        AccountFields b = fields("Y", new BigDecimal("100.00"), "JOHN", "2021-01-01");
        assertThat(AccountFieldsComparator.equal(a, b)).isFalse();
    }

    private AccountFields fieldsWithAddress(String stateCd, String countryCd) {
        return new AccountFields("Y", new BigDecimal("100.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, "2020-01-01", "2030-01-01", "2020-01-01", "GRP01", "JOHN", "M", "DOE",
                "1 MAIN ST", "", "CITY", stateCd, countryCd, "27601", "", "", "123456789", "GOVID", "1980-01-01",
                "1", "Y", 700);
    }

    /** Finding #3: a state-only change must not be silently ignored by the concurrency
     * snapshot comparison (COACTUPC.cbl:1681-1775 compares addrStateCd too). */
    @Test
    void differentStateCodeIsNotEqual() {
        AccountFields a = fieldsWithAddress("NC", "USA");
        AccountFields b = fieldsWithAddress("VA", "USA");
        assertThat(AccountFieldsComparator.equal(a, b)).isFalse();
    }

    /** Finding #3: a country-only change must not be silently ignored either. */
    @Test
    void differentCountryCodeIsNotEqual() {
        AccountFields a = fieldsWithAddress("NC", "USA");
        AccountFields b = fieldsWithAddress("NC", "CAN");
        assertThat(AccountFieldsComparator.equal(a, b)).isFalse();
    }

    /** State/country comparisons follow the same trimmed/case-insensitive semantics as the
     * other name/address fields (COACTUPC.cbl FUNCTION UPPER-CASE(FUNCTION TRIM(...))). */
    @Test
    void stateAndCountryComparisonIsTrimmedAndCaseInsensitive() {
        AccountFields a = fieldsWithAddress("NC", "USA");
        AccountFields b = fieldsWithAddress(" nc ", " usa ");
        assertThat(AccountFieldsComparator.equal(a, b)).isTrue();
    }
}
