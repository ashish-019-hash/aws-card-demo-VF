package com.carddemo.backend.exception;

import java.util.List;

/** Thrown by validation services when one or more VR-xxx checks fail. */
public class ValidationFailedException extends RuntimeException {

    private final List<FieldError> errors;

    public ValidationFailedException(List<FieldError> errors) {
        super("Validation failed: " + errors.size() + " error(s)");
        this.errors = errors;
    }

    public List<FieldError> getErrors() { return errors; }
}
