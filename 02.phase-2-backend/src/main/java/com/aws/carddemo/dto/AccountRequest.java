package com.aws.carddemo.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AccountRequest(
        @NotNull Long version,
        @Size(max = 1) String activeStatus,
        BigDecimal currentBalance,
        BigDecimal creditLimit,
        BigDecimal cashCreditLimit,
        @Size(max = 10) String openDate,
        @Size(max = 10) String expirationDate,
        @Size(max = 10) String reissueDate,
        BigDecimal currentCycleCredit,
        BigDecimal currentCycleDebit,
        @Size(max = 10) String addressZip,
        @Size(max = 10) String groupId) { }
