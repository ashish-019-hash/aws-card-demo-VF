package com.carddemo.backend.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final String ruleId;
    private final String field;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null, null);
    }

    public ApiException(HttpStatus status, String code, String message, String ruleId, String field) {
        super(message);
        this.status = status;
        this.code = code;
        this.ruleId = ruleId;
        this.field = field;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public String getRuleId() { return ruleId; }
    public String getField() { return field; }
}
