package com.carddemo.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the central error-envelope mapping. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void conflictWithReasonIncludesReasonField() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleConflict(new ConflictException("DATA_CHANGED", "Record changed by some one else. Please review"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "CONFLICT")
                .containsEntry("reason", "DATA_CHANGED")
                .containsEntry("message", "Record changed by some one else. Please review");
    }

    @Test
    void conflictWithoutReasonOmitsReasonField() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleConflict(new ConflictException("User ID already exist..."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "CONFLICT").doesNotContainKey("reason");
    }

    /**
     * Safety net: any DataIntegrityViolationException (FK/unique-constraint violation) that
     * reaches the controller layer without being pre-checked by a service must be reported as
     * a 409 with a non-technical message, never surface as a raw 500.
     */
    @Test
    void dataIntegrityViolationIsMappedToNonTechnicalConflict() {
        ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrityViolation(
                new DataIntegrityViolationException("insert or update on table \"transactions\" violates "
                        + "foreign key constraint \"transactions_type_fkey\""));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("code", "CONFLICT");
        String message = (String) response.getBody().get("message");
        assertThat(message).doesNotContain("SQL", "constraint", "transactions_type_fkey");
    }
}
