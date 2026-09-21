package com.carddemo.backend.validation;

import com.carddemo.backend.dto.TransactionAddRequest;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.exception.ValidationFailedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Add Transaction field validations (COTRN02C.cbl, VR-075..VR-093). VR-072/VR-073
 * (accountId/cardNum numeric-if-supplied) and VR-074 (at least one of the two must be
 * present) are enforced by the DTO's typed {@code Long}/JSON binding and by
 * {@code TransactionService.resolveCardNum}, respectively; VR-094 (confirm gate) is
 * enforced in {@code TransactionService.addTransaction}.
 */
@Service
public class TransactionValidationService {

    public void validate(TransactionAddRequest r) {
        List<FieldError> errors = CommonValidators.newList();

        CommonValidators.mandatory(errors, "typeCd", "Type CD", "VR-075", r.typeCd());
        if (r.typeCd() != null && !r.typeCd().isBlank() && !r.typeCd().matches("[0-9]+")) {
            errors.add(new FieldError("typeCd", "VR-086", "Type CD must be Numeric..."));
        }
        if (r.catCd() == null) {
            errors.add(new FieldError("catCd", "VR-076", "Category CD can NOT be empty..."));
        }
        CommonValidators.mandatory(errors, "source", "Source", "VR-077", r.source());
        CommonValidators.mandatory(errors, "description", "Description", "VR-078", r.description());
        if (r.amount() == null) {
            errors.add(new FieldError("amount", "VR-079", "Amount can NOT be empty..."));
        } else if (r.amount().scale() > 2 || r.amount().precision() - r.amount().scale() > 8) {
            errors.add(new FieldError("amount", "VR-088", "Amount should be in format -99999999.99"));
        }

        validateDate(errors, "origDate", "Orig Date", "VR-080", "VR-089", "VR-091", r.origDate());
        validateDate(errors, "procDate", "Proc Date", "VR-081", "VR-090", "VR-092", r.procDate());

        if (r.merchantId() == null) {
            errors.add(new FieldError("merchantId", "VR-082", "Merchant ID can NOT be empty..."));
        }
        CommonValidators.mandatory(errors, "merchantName", "Merchant Name", "VR-083", r.merchantName());
        CommonValidators.mandatory(errors, "merchantCity", "Merchant City", "VR-084", r.merchantCity());
        CommonValidators.mandatory(errors, "merchantZip", "Merchant Zip", "VR-085", r.merchantZip());

        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }

    private void validateDate(List<FieldError> errors, String field, String label, String requiredRule,
                               String formatRule, String validityRule, String value) {
        if (value == null || value.isBlank()) {
            errors.add(new FieldError(field, requiredRule, label + " can NOT be empty..."));
            return;
        }
        try {
            LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            errors.add(new FieldError(field, formatRule, label + " should be in format YYYY-MM-DD"));
            return;
        }
    }
}
