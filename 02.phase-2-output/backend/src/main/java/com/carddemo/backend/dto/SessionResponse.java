package com.carddemo.backend.dto;

/** Response body for GET/POST /api/session. */
public record SessionResponse(boolean authenticated, String userId, String firstName, String lastName,
                               String userType) {

    public static SessionResponse anonymous() {
        return new SessionResponse(false, null, null, null, null);
    }
}
