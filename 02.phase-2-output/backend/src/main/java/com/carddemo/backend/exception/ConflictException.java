package com.carddemo.backend.exception;

/** 409: a duplicate key or an optimistic-concurrency conflict (BR-007/BR-009/BR-010/BR-016). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
