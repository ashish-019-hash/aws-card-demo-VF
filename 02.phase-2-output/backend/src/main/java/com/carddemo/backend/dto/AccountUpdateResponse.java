package com.carddemo.backend.dto;

/** Response body for PUT /api/accounts/{id}. */
public record AccountUpdateResponse(boolean changed, AccountView account) {
}
