package com.carddemo.backend.exception;

/** A single field-level validation failure, tagged with the VR-xxx rule id it enforces. */
public record FieldError(String field, String rule, String message) {
}
