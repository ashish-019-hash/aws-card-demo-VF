package com.carddemo.backend.validation;

import com.carddemo.backend.exception.FieldError;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** VR-009..VR-014, VR-030..VR-035 generic editor unit tests. */
class CommonValidatorsTest {

    @Test
    void mandatory_rejectsBlank() {
        List<FieldError> errors = CommonValidators.newList();
        boolean ok = CommonValidators.mandatory(errors, "f", "Field", "VR-009", "  ");
        assertThat(ok).isFalse();
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).getRule()).isEqualTo("VR-009");
    }

    @Test
    void mandatory_acceptsPresent() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.mandatory(errors, "f", "Field", "VR-009", "x")).isTrue();
        assertThat(errors).isEmpty();
    }

    @Test
    void yesNo_rejectsInvalidValue() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.yesNo(errors, "f", "Flag", "VR-010", "X")).isFalse();
        assertThat(errors).hasSize(1);
    }

    @Test
    void yesNo_acceptsYOrN() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.yesNo(errors, "f", "Flag", "VR-010", "y")).isTrue();
        assertThat(CommonValidators.yesNo(errors, "f", "Flag", "VR-010", "N")).isTrue();
        assertThat(errors).isEmpty();
    }

    @Test
    void alphaRequired_rejectsDigits() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.alphaRequired(errors, "f", "Name", "VR-011", "John3")).isFalse();
    }

    @Test
    void alphaOptional_allowsBlank() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.alphaOptional(errors, "f", "Name", "VR-012", "")).isTrue();
        assertThat(errors).isEmpty();
    }

    @Test
    void numericRequired_rejectsZero() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.numericRequired(errors, "f", "Id", "VR-013", "0")).isFalse();
    }

    @Test
    void numericRequired_rejectsNonDigits() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.numericRequired(errors, "f", "Id", "VR-013", "12a")).isFalse();
    }

    @Test
    void numericFilterOptional_allowsBlank() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.numericFilterOptional(errors, "f", "VR-054", null, 11, "msg")).isTrue();
    }

    @Test
    void numericFilterOptional_rejectsWrongLength() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.numericFilterOptional(errors, "f", "VR-054", "123", 11, "msg")).isFalse();
    }

    @Test
    void signed9v2_rejectsMissing() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.signed9v2(errors, "f", "Amt", "VR-014", null)).isFalse();
    }

    @Test
    void signed9v2_rejectsTooManyDecimals() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.signed9v2(errors, "f", "Amt", "VR-014", new BigDecimal("1.234"))).isFalse();
    }

    @Test
    void signed9v2_acceptsValid() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.signed9v2(errors, "f", "Amt", "VR-014", new BigDecimal("-1234.56"))).isTrue();
        assertThat(errors).isEmpty();
    }

    @Test
    void dateCcyymmdd_rejectsBadFormat() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.dateCcyymmdd(errors, "f", "Date", "VR-030", "2022/06/10")).isFalse();
    }

    @Test
    void dateCcyymmdd_rejectsImpossibleCalendarDate() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.dateCcyymmdd(errors, "f", "Date", "VR-030", "2022-02-30")).isFalse();
    }

    @Test
    void dateCcyymmdd_acceptsValidDate() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.dateCcyymmdd(errors, "f", "Date", "VR-030", "2022-06-10")).isTrue();
        assertThat(errors).isEmpty();
    }

    @Test
    void dateOfBirthNotFuture_rejectsFutureDate() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.dateOfBirthNotFuture(errors, "dob", "DOB", "VR-035", "2999-01-01")).isFalse();
    }

    @Test
    void dateOfBirthNotFuture_acceptsPastDate() {
        List<FieldError> errors = CommonValidators.newList();
        assertThat(CommonValidators.dateOfBirthNotFuture(errors, "dob", "DOB", "VR-035", "1980-01-01")).isTrue();
        assertThat(errors).isEmpty();
    }
}
