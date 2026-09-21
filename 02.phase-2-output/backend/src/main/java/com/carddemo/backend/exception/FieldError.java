package com.carddemo.backend.exception;

/** A single field-level validation failure, tagged with the VR-xxx rule id it enforces. */
public class FieldError {
    private final String field;
    private final String rule;
    private final String message;

    public FieldError(String field, String rule, String message) {
        this.field = field;
        this.rule = rule;
        this.message = message;
    }

    public String getField() { return field; }
    public String getRule() { return rule; }
    public String getMessage() { return message; }
}
