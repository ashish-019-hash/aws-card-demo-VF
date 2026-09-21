package com.carddemo.backend.dto;

/**
 * Request body for PUT /api/accounts/{id} (BR-006/BR-007/BR-008).
 *
 * <p>{@code expected} must equal the values the client most recently read (the
 * "snapshot"); if the live record no longer matches it, the server rejects the update
 * with 409 CONFLICT ("someone else changed this record") rather than overwriting it.
 * If {@code updated} is field-for-field identical to {@code expected}, the server
 * returns 200 with {@code changed:false} and does not write anything (BR-006).</p>
 */
public record AccountUpdateRequest(AccountFields expected, AccountFields updated) {
}
