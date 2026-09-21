package com.carddemo.backend.dto;

/**
 * Card editable fields (COCRDUPC: CVV, embossed name, expiry date, active status —
 * BR-009). {@code expirationDate} is the full persisted {@code YYYY-MM-DD} string;
 * VR-067/VR-068 validate the month (1-12) and year (1950-2099) portions of it.
 */
public record CardFields(Integer cvvCd, String embossedName, String expirationDate, String activeStatus) {
}
