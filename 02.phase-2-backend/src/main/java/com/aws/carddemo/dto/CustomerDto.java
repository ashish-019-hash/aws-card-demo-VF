package com.aws.carddemo.dto;

public record CustomerDto(
        Long id,
        Long version,
        String firstName,
        String middleName,
        String lastName,
        String addressLine1,
        String addressLine2,
        String addressLine3,
        String addressStateCode,
        String addressCountryCode,
        String addressZip,
        String phoneNumber1,
        String phoneNumber2,
        Long ssn,
        String governmentIssuedId,
        String dateOfBirth,
        String eftAccountId,
        String primaryCardholderIndicator,
        Integer ficoCreditScore) { }
