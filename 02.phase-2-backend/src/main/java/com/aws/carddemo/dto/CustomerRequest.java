package com.aws.carddemo.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

public record CustomerRequest(
        @NotNull Long version,
        @Size(max = 25) String firstName,
        @Size(max = 25) String middleName,
        @Size(max = 25) String lastName,
        @Size(max = 50) String addressLine1,
        @Size(max = 50) String addressLine2,
        @Size(max = 50) String addressLine3,
        @Size(max = 2) String addressStateCode,
        @Size(max = 3) String addressCountryCode,
        @Size(max = 10) String addressZip,
        @Size(max = 15) String phoneNumber1,
        @Size(max = 15) String phoneNumber2,
        @Size(min = 9, max = 9) String ssn,
        @Size(max = 20) String governmentIssuedId,
        @Size(max = 10) String dateOfBirth,
        @Size(max = 10) String eftAccountId,
        @Size(max = 1) String primaryCardholderIndicator,
        Integer ficoCreditScore) { }
