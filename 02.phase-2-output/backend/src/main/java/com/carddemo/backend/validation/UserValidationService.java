package com.carddemo.backend.validation;

import com.carddemo.backend.dto.UserRequest;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.exception.ValidationFailedException;
import org.springframework.stereotype.Service;

import java.util.List;

/** Add/Update User field validations (COUSR01C/COUSR02C, VR-116..VR-126). */
@Service
public class UserValidationService {

    public void validateForCreate(UserRequest r) {
        List<FieldError> errors = CommonValidators.newList();
        CommonValidators.mandatory(errors, "firstName", "First Name", "VR-116", r.firstName());
        CommonValidators.mandatory(errors, "lastName", "Last Name", "VR-117", r.lastName());
        CommonValidators.mandatory(errors, "userId", "User ID", "VR-118", r.userId());
        CommonValidators.mandatory(errors, "password", "Password", "VR-119", r.password());
        CommonValidators.mandatory(errors, "userType", "User Type", "VR-120", r.userType());
        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }

    public void validateForUpdate(UserRequest r) {
        List<FieldError> errors = CommonValidators.newList();
        CommonValidators.mandatory(errors, "firstName", "First Name", "VR-123", r.firstName());
        CommonValidators.mandatory(errors, "lastName", "Last Name", "VR-124", r.lastName());
        CommonValidators.mandatory(errors, "password", "Password", "VR-125", r.password());
        CommonValidators.mandatory(errors, "userType", "User Type", "VR-126", r.userType());
        if (!errors.isEmpty()) {
            throw new ValidationFailedException(errors);
        }
    }
}
