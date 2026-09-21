package com.carddemo.backend.exception;

/** 409: a duplicate key or an optimistic-concurrency conflict (BR-007/BR-009/BR-010/BR-016). */
public class ConflictException extends RuntimeException {

    private final String reason;

    public ConflictException(String message) {
        this(null, message);
    }

    /**
     * @param reason a machine-readable discriminator surfaced as the error envelope's
     *               {@code reason} field (e.g. {@code "DATA_CHANGED"}, {@code "UPDATE_FAILED"}),
     *               or {@code null} when this conflict has no such discriminator (e.g.
     *               duplicate-key conflicts).
     */
    public ConflictException(String reason, String message) {
        super(message);
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }
}
