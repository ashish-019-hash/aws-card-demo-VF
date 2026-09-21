package com.carddemo.backend.dto;

import java.math.BigDecimal;

/**
 * The editable fields of an account+customer, shared by the "current" view returned
 * from GET, the "expected" snapshot sent back on PUT, and the "updated" values on PUT.
 * Mirrors the fields edited on screen COACTUP (ACCT-RECORD + CUSTOMER-RECORD).
 */
public record AccountFields(
        String activeStatus,
        BigDecimal creditLimit,
        BigDecimal cashCreditLimit,
        BigDecimal currBal,
        BigDecimal currCycCredit,
        BigDecimal currCycDebit,
        String openDate,
        String expirationDate,
        String reissueDate,
        String groupId,
        String firstName,
        String middleName,
        String lastName,
        String addrLine1,
        String addrLine2,
        String addrLine3,
        String addrStateCd,
        String addrCountryCd,
        String addrZip,
        String phoneNum1,
        String phoneNum2,
        String ssn,
        String govtIssuedId,
        String dob,
        String eftAccountId,
        String priCardHolderInd,
        Integer ficoCreditScore) {
}
