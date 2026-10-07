package com.aws.carddemo.dto;

public record CreditCardDto(
        String cardNumber,
        Long version,
        Long accountId,
        Integer cvvCode,
        String embossedName,
        String expirationDate,
        String activeStatus) { }
