package com.aws.carddemo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreditCardRequest(
        @NotNull Long version,
        @NotNull Long accountId,
        Integer cvvCode,
        @Size(max = 50) String embossedName,
        @Size(max = 10) String expirationDate,
        @Size(max = 1) String activeStatus) { }
