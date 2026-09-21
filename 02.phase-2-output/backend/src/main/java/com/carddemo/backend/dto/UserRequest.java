package com.carddemo.backend.dto;

/** Request for POST /api/users (Add) and PUT /api/users/{userId} (Update) — COUSR01C/COUSR02C. */
public record UserRequest(String userId, String firstName, String lastName, String password, String userType) {
}
