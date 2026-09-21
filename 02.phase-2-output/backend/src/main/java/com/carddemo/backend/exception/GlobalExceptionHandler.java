package com.carddemo.backend.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Central error-response mapping. Response shape for validation failures:
 * {@code { "code": "VALIDATION_FAILED", "message": "...", "errors": [{ "field", "rule", "message" }] } }.
 * {@link FieldError} is a record whose component names already match that JSON shape, so
 * Jackson serializes {@code ex.getErrors()} directly with no intermediate mapping step.
 * {@code CONFLICT} responses additionally carry a {@code reason} field
 * ({@code "DATA_CHANGED"} | {@code "UPDATE_FAILED"}) when the conflict has one — see
 * {@link ConflictException#getReason()}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ValidationFailedException.class)
    public ResponseEntity<Map<String, Object>> handleValidationFailed(ValidationFailedException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "VALIDATION_FAILED");
        body.put("message", "One or more fields failed validation.");
        body.put("errors", ex.getErrors());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(simple("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException ex) {
        Map<String, Object> body = simple("CONFLICT", ex.getMessage());
        if (ex.getReason() != null) {
            body.put("reason", ex.getReason());
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    /**
     * Safety net: a DB-level FK/unique-constraint violation that reaches the controller layer
     * without being pre-checked by a service (e.g. an unanticipated constraint) must never
     * surface as a raw 500 — map it to a 409 with a non-technical message instead.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(simple("CONFLICT", "The request could not be completed because it conflicts with existing data."));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(simple("UNAUTHORIZED", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(simple("FORBIDDEN", "No access - Admin Only option."));
    }

    private Map<String, Object> simple(String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        return body;
    }
}
