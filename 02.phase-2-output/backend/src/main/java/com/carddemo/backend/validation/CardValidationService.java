package com.carddemo.backend.validation;

import com.carddemo.backend.dto.CardFields;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.exception.ValidationFailedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/** Card Update field validations (COCRDUPC.cbl, VR-064..VR-068). */
@Service
public class CardValidationService {

    public void validate(CardFields f) {
        List<FieldError> errors = CommonValidators.newList();

        CommonValidators.mandatory(errors, "embossedName", "Card name", "VR-064", f.embossedName());
        if (f.embossedName() != null && !f.embossedName().isBlank()
                && !f.embossedName().matches("[A-Za-z ]+")) {
            errors.add(new FieldError("embossedName", "VR-065", "Card name can only contain alphabets and spaces"));
        }

        if (f.activeStatus() == null
                || (!f.activeStatus().equalsIgnoreCase("Y") && !f.activeStatus().equalsIgnoreCase("N"))) {
            errors.add(new FieldError("activeStatus", "VR-066", "Card Active Status must be Y or N"));
        }

        if (f.cvvCd() == null || f.cvvCd() < 0 || f.cvvCd() > 999) {
            errors.add(new FieldError("cvvCd", "VR-069", "Card CVV code must be a 3 digit number"));
        }

        validateExpirationDate(errors, f.expirationDate());

        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }

    private void validateExpirationDate(List<FieldError> errors, String expirationDate) {
        if (expirationDate == null || expirationDate.isBlank()) {
            errors.add(new FieldError("expirationDate", "VR-067", "Card expiry month must be between 1 and 12"));
            return;
        }
        LocalDate date;
        try {
            date = LocalDate.parse(expirationDate);
        } catch (DateTimeParseException e) {
            errors.add(new FieldError("expirationDate", "VR-067", "Card expiry month must be between 1 and 12"));
            return;
        }
        if (date.getMonthValue() < 1 || date.getMonthValue() > 12) {
            errors.add(new FieldError("expirationDate", "VR-067", "Card expiry month must be between 1 and 12"));
        }
        if (date.getYear() < 1950 || date.getYear() > 2099) {
            errors.add(new FieldError("expirationDate", "VR-068", "Invalid card expiry year"));
        }
    }
}
