package com.carddemo.backend.dto;

/** Response body for GET /api/accounts/{id} — account + customer + primary card-xref view. */
public record AccountView(Long acctId, Long custId, String cardNum, AccountFields fields) {
}
