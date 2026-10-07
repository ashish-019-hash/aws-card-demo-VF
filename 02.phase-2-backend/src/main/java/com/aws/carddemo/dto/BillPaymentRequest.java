package com.aws.carddemo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BillPaymentRequest(@NotNull Long accountId, @Size(max = 1) String confirmation) { }
