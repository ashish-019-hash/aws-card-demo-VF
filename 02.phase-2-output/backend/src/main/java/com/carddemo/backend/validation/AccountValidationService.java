package com.carddemo.backend.validation;

import com.carddemo.backend.dto.AccountFields;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.exception.ValidationFailedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Account Update field validations (COACTUPC.cbl, VR-015..VR-030c, VR-040..VR-053) applied
 * to the "updated" values of a PUT /api/accounts/{id} request. Every failing field is
 * collected before throwing so the caller sees every problem at once, matching how the
 * legacy screen highlights every failing field in a single pass.
 */
@Service
public class AccountValidationService {

    private static final Pattern PHONE = Pattern.compile("\\((\\d{3})\\)(\\d{3})-(\\d{4})");

    private final ReferenceData referenceData;

    public AccountValidationService(ReferenceData referenceData) {
        this.referenceData = referenceData;
    }

    public void validate(AccountFields f) {
        List<FieldError> errors = new ArrayList<>();

        CommonValidators.yesNo(errors, "activeStatus", "Account Status", "VR-015", f.activeStatus());
        CommonValidators.signed9v2(errors, "creditLimit", "Credit Limit", "VR-016", f.creditLimit());
        CommonValidators.signed9v2(errors, "cashCreditLimit", "Cash Credit Limit", "VR-017", f.cashCreditLimit());
        CommonValidators.signed9v2(errors, "currBal", "Current Balance", "VR-018", f.currBal());
        CommonValidators.signed9v2(errors, "currCycCredit", "Current Cycle Credit", "VR-019", f.currCycCredit());
        CommonValidators.signed9v2(errors, "currCycDebit", "Current Cycle Debit", "VR-020", f.currCycDebit());

        if (f.ficoCreditScore() == null) {
            errors.add(new FieldError("ficoCreditScore", "VR-021", "FICO Score must be supplied."));
        } else if (f.ficoCreditScore() < 300 || f.ficoCreditScore() > 850) {
            errors.add(new FieldError("ficoCreditScore", "VR-040", "FICO Score: should be between 300 and 850"));
        }

        CommonValidators.alphaRequired(errors, "firstName", "First Name", "VR-022", f.firstName());
        CommonValidators.maxLength(errors, "firstName", "First Name", "VR-022", f.firstName(), 25);
        CommonValidators.alphaOptional(errors, "middleName", "Middle Name", "VR-023", f.middleName());
        CommonValidators.maxLength(errors, "middleName", "Middle Name", "VR-023", f.middleName(), 25);
        CommonValidators.alphaRequired(errors, "lastName", "Last Name", "VR-024", f.lastName());
        CommonValidators.maxLength(errors, "lastName", "Last Name", "VR-024", f.lastName(), 25);
        CommonValidators.mandatory(errors, "addrLine1", "Address Line 1", "VR-025", f.addrLine1());
        CommonValidators.maxLength(errors, "addrLine1", "Address Line 1", "VR-025", f.addrLine1(), 50);
        CommonValidators.maxLength(errors, "addrLine2", "Address Line 2", "VR-025b", f.addrLine2(), 50);

        boolean stateOk = CommonValidators.alphaRequired(errors, "addrStateCd", "State", "VR-026",
                f.addrStateCd());
        if (stateOk && !referenceData.isValidStateCode(f.addrStateCd().toUpperCase())) {
            errors.add(new FieldError("addrStateCd", "VR-041", "State: is not a valid state code"));
            stateOk = false;
        }

        boolean zipOk = f.addrZip() != null && f.addrZip().length() >= 5
                && CommonValidators.numericFilterOptional(errors, "addrZip", "VR-027", f.addrZip().substring(0, 5),
                        5, "Zip must  be a non-zero 5 digit number");
        if (f.addrZip() == null || f.addrZip().isBlank()) {
            errors.add(new FieldError("addrZip", "VR-027", "Zip must be supplied."));
            zipOk = false;
        }
        CommonValidators.maxLength(errors, "addrZip", "Zip", "VR-027", f.addrZip(), 10);

        if (stateOk && zipOk && !referenceData.isValidStateZipCombo(f.addrStateCd().toUpperCase(),
                f.addrZip().substring(0, 2))) {
            errors.add(new FieldError("addrZip", "VR-042", "Invalid zip code for state"));
        }

        CommonValidators.alphaRequired(errors, "addrLine3", "City", "VR-028", f.addrLine3());
        CommonValidators.maxLength(errors, "addrLine3", "City", "VR-028", f.addrLine3(), 50);
        CommonValidators.alphaRequired(errors, "addrCountryCd", "Country", "VR-029", f.addrCountryCd());
        CommonValidators.maxLength(errors, "addrCountryCd", "Country", "VR-029", f.addrCountryCd(), 3);
        CommonValidators.numericRequired(errors, "eftAccountId", "EFT Account Id", "VR-030b", f.eftAccountId());
        CommonValidators.maxLength(errors, "eftAccountId", "EFT Account Id", "VR-030b", f.eftAccountId(), 10);
        CommonValidators.maxLength(errors, "govtIssuedId", "Government Issued Id", "VR-030a", f.govtIssuedId(), 20);
        // ACCT-GROUP-ID is PIC X(10) (CVACT01Y); legacy has no edit for it beyond the field width.
        CommonValidators.maxLength(errors, "groupId", "Account Group Id", "VR-WIDTH-001", f.groupId(), 10);
        CommonValidators.yesNo(errors, "priCardHolderInd", "Primary Card Holder", "VR-030c", f.priCardHolderInd());

        CommonValidators.dateCcyymmdd(errors, "openDate", "Open Date", "VR-030", f.openDate());
        CommonValidators.dateCcyymmdd(errors, "expirationDate", "Expiry Date", "VR-030", f.expirationDate());
        CommonValidators.dateCcyymmdd(errors, "reissueDate", "Reissue Date", "VR-030", f.reissueDate());
        if (CommonValidators.dateCcyymmdd(errors, "dob", "Date of Birth", "VR-030", f.dob())) {
            CommonValidators.dateOfBirthNotFuture(errors, "dob", "Date of Birth", "VR-035", f.dob());
        }

        validatePhone(errors, "phoneNum1", "Phone Number 1", f.phoneNum1());
        validatePhone(errors, "phoneNum2", "Phone Number 2", f.phoneNum2());
        validateSsn(errors, f.ssn());

        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }

    /** VR-043..VR-047 (1260-EDIT-US-PHONE-NUM), applied once per phone field. The persisted
     * column is a fixed-width `PIC X(15)` and legacy/seed data commonly stores the
     * 13-character "(NNN)NNN-NNNN" value right-padded with trailing spaces to fill it, so
     * this trims before matching — otherwise re-submitting an account's own unchanged,
     * already-persisted phone number (as returned by GET) would fail this check. */
    private void validatePhone(List<FieldError> errors, String field, String label, String value) {
        if (value == null || value.isBlank()) {
            return; // VR-043: blank phone is valid
        }
        var m = PHONE.matcher(value.trim());
        if (!m.matches()) {
            errors.add(new FieldError(field, "VR-045", label + ": Area code must be A 3 digit number."));
            return;
        }
        String area = m.group(1);
        String prefix = m.group(2);
        String line = m.group(3);
        if ("000".equals(area)) {
            errors.add(new FieldError(field, "VR-046", label + ": Area code cannot be zero"));
        } else if (!referenceData.isValidAreaCode(area)) {
            errors.add(new FieldError(field, "VR-047", label + ": Not valid North America general purpose area code"));
        }
        // VR-048/VR-049: prefix must be a 3 digit number (guaranteed by the regex match itself).
        if ("000".equals(prefix)) {
            // VR-050: prefix cannot be zero.
            errors.add(new FieldError(field, "VR-050", label + ": Prefix code cannot be zero"));
        }
        // VR-051/VR-052: line number must be a 4 digit number (guaranteed by the regex match itself).
        if ("0000".equals(line)) {
            // VR-053: line number cannot be zero.
            errors.add(new FieldError(field, "VR-053", label + ": Line number cannot be zero"));
        }
    }

    /** VR-036..VR-039 (COACTUPC.cbl:2430-2495): SSN 3-2-4 digit groups, each independently
     * required + numeric (VR-013 via CommonValidators.numericRequired); the 000/666/900-999
     * range check (VR-037) only runs once the first group itself passed. */
    private void validateSsn(List<FieldError> errors, String ssn) {
        String value = ssn == null ? "" : ssn;
        if (value.length() > 9) {
            errors.add(new FieldError("ssn", "VR-036", "SSN: First 3 chars must be all numeric."));
            return;
        }
        String part1 = safeSubstring(value, 0, 3);
        String part2 = safeSubstring(value, 3, 5);
        String part3 = safeSubstring(value, 5, 9);

        boolean part1Ok = CommonValidators.numericRequired(errors, "ssn", "SSN: First 3 chars", "VR-036", part1);
        CommonValidators.numericRequired(errors, "ssn", "SSN 4th & 5th chars", "VR-038", part2);
        CommonValidators.numericRequired(errors, "ssn", "SSN Last 4 chars", "VR-039", part3);

        if (part1Ok) {
            int first3 = Integer.parseInt(part1);
            if (first3 == 0 || first3 == 666 || (first3 >= 900 && first3 <= 999)) {
                errors.add(new FieldError("ssn", "VR-037",
                        "SSN: First 3 chars: should not be 000, 666, or between 900 and 999"));
            }
        }
    }

    private static String safeSubstring(String s, int start, int end) {
        if (start >= s.length()) {
            return "";
        }
        return s.substring(start, Math.min(end, s.length()));
    }
}
