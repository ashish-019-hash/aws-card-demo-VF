package com.carddemo.backend.dto;

/** Request body for PUT /api/cards/{cardNumber} — same expected/updated shape as accounts (BR-009). */
public record CardUpdateRequest(CardFields expected, CardFields updated) {
}
