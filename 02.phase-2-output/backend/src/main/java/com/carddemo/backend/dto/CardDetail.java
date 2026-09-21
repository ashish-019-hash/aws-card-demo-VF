package com.carddemo.backend.dto;

/** Full detail for GET /api/cards/{cardNumber}. */
public record CardDetail(String cardNum, Long acctId, CardFields fields) {
}
