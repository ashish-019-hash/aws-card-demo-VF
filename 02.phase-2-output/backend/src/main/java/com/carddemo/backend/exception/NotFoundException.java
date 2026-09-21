package com.carddemo.backend.exception;

/** 404: a record could not be found, carrying the exact legacy message text. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
