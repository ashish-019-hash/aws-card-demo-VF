package com.carddemo.backend.dto;

/** A single row in a card list/browse (BR-014/BR-015). */
public record CardSummary(String cardNum, Long acctId, String embossedName, String activeStatus) {
}
