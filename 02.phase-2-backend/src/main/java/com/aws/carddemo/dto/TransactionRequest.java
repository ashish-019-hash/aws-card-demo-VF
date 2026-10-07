package com.aws.carddemo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TransactionRequest(
        @NotBlank @Size(min = 16, max = 16) String id,
        Long accountId,
        @NotBlank @Size(min = 2, max = 2) String transactionTypeCode,
        @NotNull Integer transactionCategoryCode,
        @NotBlank @Size(max = 10) String source,
        @NotBlank @Size(max = 100) String description,
        @NotBlank String amount,
        @NotBlank @Size(min = 9, max = 9) String merchantId,
        @NotBlank @Size(max = 50) String merchantName,
        @NotBlank @Size(max = 50) String merchantCity,
        @NotBlank @Size(max = 10) String merchantZip,
        @Size(min = 16, max = 16) String cardNumber,
        @NotBlank @Size(max = 26) String originationTimestamp,
        @NotBlank @Size(max = 26) String processingTimestamp,
        @NotBlank @Size(max = 1) String confirmation) { }
