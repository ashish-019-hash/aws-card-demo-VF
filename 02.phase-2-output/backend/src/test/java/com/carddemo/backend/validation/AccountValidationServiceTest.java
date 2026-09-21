package com.carddemo.backend.validation;

import com.carddemo.backend.dto.AccountFields;
import com.carddemo.backend.exception.ValidationFailedException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** VR-015..VR-053 Account Update validation unit tests (BR-006/BR-007 upstream gate). */
class AccountValidationServiceTest {

    private final AccountValidationService service = new AccountValidationService(new ReferenceData());

    private AccountFields validFields() {
        return new AccountFields(
                "Y", new BigDecimal("1000.00"), new BigDecimal("500.00"), new BigDecimal("100.00"),
                new BigDecimal("0.00"), new BigDecimal("0.00"),
                "2020-01-01", "2030-01-01", "2020-01-01",
                "GRP01", "JOHN", "Q", "DOE",
                "123 MAIN ST", "", "RALEIGH",
                "NC", "USA", "27601",
                "(212)555-1234", "", "123456789",
                "GOVID1234", "1980-05-15",
                "0000000001", "Y", 720);
    }

    @Test
    void acceptsFullyValidFields() {
        service.validate(validFields()); // must not throw
    }

    @Test
    void rejectsInvalidActiveStatus() {
        AccountFields f = withActiveStatus(validFields(), "X");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-015")));
    }

    @Test
    void rejectsFicoOutOfRange() {
        AccountFields base = validFields();
        AccountFields f = new AccountFields(base.activeStatus(), base.creditLimit(), base.cashCreditLimit(),
                base.currBal(), base.currCycCredit(), base.currCycDebit(), base.openDate(), base.expirationDate(),
                base.reissueDate(), base.groupId(), base.firstName(), base.middleName(), base.lastName(),
                base.addrLine1(), base.addrLine2(), base.addrLine3(), base.addrStateCd(), base.addrCountryCd(),
                base.addrZip(), base.phoneNum1(), base.phoneNum2(), base.ssn(), base.govtIssuedId(), base.dob(),
                base.eftAccountId(), base.priCardHolderInd(), 250);
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-040")));
    }

    @Test
    void rejectsUnknownStateCode() {
        AccountFields base = validFields();
        AccountFields f = new AccountFields(base.activeStatus(), base.creditLimit(), base.cashCreditLimit(),
                base.currBal(), base.currCycCredit(), base.currCycDebit(), base.openDate(), base.expirationDate(),
                base.reissueDate(), base.groupId(), base.firstName(), base.middleName(), base.lastName(),
                base.addrLine1(), base.addrLine2(), base.addrLine3(), "ZZ", base.addrCountryCd(),
                base.addrZip(), base.phoneNum1(), base.phoneNum2(), base.ssn(), base.govtIssuedId(), base.dob(),
                base.eftAccountId(), base.priCardHolderInd(), base.ficoCreditScore());
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-041")));
    }

    @Test
    void rejectsZipStateMismatch() {
        AccountFields base = validFields();
        AccountFields f = new AccountFields(base.activeStatus(), base.creditLimit(), base.cashCreditLimit(),
                base.currBal(), base.currCycCredit(), base.currCycDebit(), base.openDate(), base.expirationDate(),
                base.reissueDate(), base.groupId(), base.firstName(), base.middleName(), base.lastName(),
                base.addrLine1(), base.addrLine2(), base.addrLine3(), "NC", base.addrCountryCd(),
                "99999", base.phoneNum1(), base.phoneNum2(), base.ssn(), base.govtIssuedId(), base.dob(),
                base.eftAccountId(), base.priCardHolderInd(), base.ficoCreditScore());
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-042")));
    }

    @Test
    void rejectsInvalidAreaCode() {
        AccountFields f = withPhone(validFields(), "(000)555-1234");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-046")));
    }

    @Test
    void rejectsUnknownAreaCode() {
        AccountFields f = withPhone(validFields(), "(999)555-1234");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-047")));
    }

    @Test
    void rejectsZeroPhonePrefix() {
        AccountFields f = withPhone(validFields(), "(212)000-1234");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-050")));
    }

    @Test
    void rejectsZeroPhoneLine() {
        AccountFields f = withPhone(validFields(), "(212)555-0000");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-053")));
    }

    @Test
    void allowsBlankPhone() {
        AccountFields f = withPhone(validFields(), "");
        service.validate(f); // must not throw
    }

    /**
     * The persisted column is a fixed-width {@code PIC X(15)} and legacy/seed data commonly
     * stores the 13-character "(NNN)NNN-NNNN" value right-padded with trailing spaces to fill
     * it (confirmed via GET /api/accounts/{id} against seeded data, e.g. "(614)594-2619  ").
     * Re-submitting an account's own unchanged, already-persisted phone number must not fail
     * this check just because of that padding.
     */
    @Test
    void allowsTrailingSpacePaddedPhone() {
        AccountFields f = withPhone(validFields(), "(212)555-1234  ");
        service.validate(f); // must not throw
    }

    @Test
    void rejectsBadSsnPrefix() {
        AccountFields base = validFields();
        AccountFields f = new AccountFields(base.activeStatus(), base.creditLimit(), base.cashCreditLimit(),
                base.currBal(), base.currCycCredit(), base.currCycDebit(), base.openDate(), base.expirationDate(),
                base.reissueDate(), base.groupId(), base.firstName(), base.middleName(), base.lastName(),
                base.addrLine1(), base.addrLine2(), base.addrLine3(), base.addrStateCd(), base.addrCountryCd(),
                base.addrZip(), base.phoneNum1(), base.phoneNum2(), "666123456", base.govtIssuedId(), base.dob(),
                base.eftAccountId(), base.priCardHolderInd(), base.ficoCreditScore());
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-037")));
    }

    @Test
    void rejectsFutureDateOfBirth() {
        AccountFields base = validFields();
        AccountFields f = new AccountFields(base.activeStatus(), base.creditLimit(), base.cashCreditLimit(),
                base.currBal(), base.currCycCredit(), base.currCycDebit(), base.openDate(), base.expirationDate(),
                base.reissueDate(), base.groupId(), base.firstName(), base.middleName(), base.lastName(),
                base.addrLine1(), base.addrLine2(), base.addrLine3(), base.addrStateCd(), base.addrCountryCd(),
                base.addrZip(), base.phoneNum1(), base.phoneNum2(), base.ssn(), base.govtIssuedId(), "2099-01-01",
                base.eftAccountId(), base.priCardHolderInd(), base.ficoCreditScore());
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-035")));
    }

    /** Finding #6: an overlong field is a 400 VALIDATION_FAILED (VR-022), not an unhandled
     * 500 from a downstream DB column-width failure. */
    @Test
    void rejectsFirstNameLongerThan25Chars() {
        AccountFields f = withFirstName(validFields(), "A".repeat(26));
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-022")));
    }

    @Test
    void acceptsFirstNameAtExactly25Chars() {
        AccountFields f = withFirstName(validFields(), "A".repeat(25));
        service.validate(f); // must not throw
    }

    /** Finding #6: SSN's three groups (VR-036/VR-038/VR-039) are each validated
     * independently — a bad middle group must not be masked by the first/last groups
     * being fine. */
    @Test
    void rejectsNonNumericSecondSsnGroup() {
        AccountFields f = withSsn(validFields(), "123XX6789");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-038")));
    }

    @Test
    void rejectsNonNumericThirdSsnGroup() {
        AccountFields f = withSsn(validFields(), "123456XXX");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-039")));
    }

    /** Finding #6: VR-037 (000/666/900-999 range check) only runs once the first SSN group
     * itself passed as numeric — it must not fire (or mask VR-036) when the first group is
     * non-numeric. */
    @Test
    void nonNumericFirstSsnGroupDoesNotAlsoTriggerRangeCheck() {
        AccountFields f = withSsn(validFields(), "12X456789");
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .noneSatisfy(err -> assertThat(err.rule()).isEqualTo("VR-037")));
    }

    private AccountFields withActiveStatus(AccountFields b, String activeStatus) {
        return new AccountFields(activeStatus, b.creditLimit(), b.cashCreditLimit(), b.currBal(), b.currCycCredit(),
                b.currCycDebit(), b.openDate(), b.expirationDate(), b.reissueDate(), b.groupId(), b.firstName(),
                b.middleName(), b.lastName(), b.addrLine1(), b.addrLine2(), b.addrLine3(), b.addrStateCd(),
                b.addrCountryCd(), b.addrZip(), b.phoneNum1(), b.phoneNum2(), b.ssn(), b.govtIssuedId(), b.dob(),
                b.eftAccountId(), b.priCardHolderInd(), b.ficoCreditScore());
    }

    private AccountFields withPhone(AccountFields b, String phone) {
        return new AccountFields(b.activeStatus(), b.creditLimit(), b.cashCreditLimit(), b.currBal(),
                b.currCycCredit(), b.currCycDebit(), b.openDate(), b.expirationDate(), b.reissueDate(), b.groupId(),
                b.firstName(), b.middleName(), b.lastName(), b.addrLine1(), b.addrLine2(), b.addrLine3(),
                b.addrStateCd(), b.addrCountryCd(), b.addrZip(), phone, b.phoneNum2(), b.ssn(), b.govtIssuedId(),
                b.dob(), b.eftAccountId(), b.priCardHolderInd(), b.ficoCreditScore());
    }

    private AccountFields withFirstName(AccountFields b, String firstName) {
        return new AccountFields(b.activeStatus(), b.creditLimit(), b.cashCreditLimit(), b.currBal(),
                b.currCycCredit(), b.currCycDebit(), b.openDate(), b.expirationDate(), b.reissueDate(), b.groupId(),
                firstName, b.middleName(), b.lastName(), b.addrLine1(), b.addrLine2(), b.addrLine3(),
                b.addrStateCd(), b.addrCountryCd(), b.addrZip(), b.phoneNum1(), b.phoneNum2(), b.ssn(),
                b.govtIssuedId(), b.dob(), b.eftAccountId(), b.priCardHolderInd(), b.ficoCreditScore());
    }

    private AccountFields withSsn(AccountFields b, String ssn) {
        return new AccountFields(b.activeStatus(), b.creditLimit(), b.cashCreditLimit(), b.currBal(),
                b.currCycCredit(), b.currCycDebit(), b.openDate(), b.expirationDate(), b.reissueDate(), b.groupId(),
                b.firstName(), b.middleName(), b.lastName(), b.addrLine1(), b.addrLine2(), b.addrLine3(),
                b.addrStateCd(), b.addrCountryCd(), b.addrZip(), b.phoneNum1(), b.phoneNum2(), ssn,
                b.govtIssuedId(), b.dob(), b.eftAccountId(), b.priCardHolderInd(), b.ficoCreditScore());
    }

    @Test
    void rejectsGroupIdWiderThanLegacyField() {
        AccountFields base = validFields();
        AccountFields f = new AccountFields(base.activeStatus(), base.creditLimit(), base.cashCreditLimit(),
                base.currBal(), base.currCycCredit(), base.currCycDebit(), base.openDate(), base.expirationDate(),
                base.reissueDate(), "GRP01234567", base.firstName(), base.middleName(), base.lastName(),
                base.addrLine1(), base.addrLine2(), base.addrLine3(), base.addrStateCd(), base.addrCountryCd(),
                base.addrZip(), base.phoneNum1(), base.phoneNum2(), base.ssn(), base.govtIssuedId(), base.dob(),
                base.eftAccountId(), base.priCardHolderInd(), base.ficoCreditScore());
        assertThatThrownBy(() -> service.validate(f))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.field()).isEqualTo("groupId")));
    }
}
