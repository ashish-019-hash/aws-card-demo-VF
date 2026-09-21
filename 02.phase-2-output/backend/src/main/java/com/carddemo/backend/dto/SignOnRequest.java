package com.carddemo.backend.dto;

/** Request body for POST /api/session (sign-on, BR-001/BR-002). */
public record SignOnRequest(String userId, String password) {
}
