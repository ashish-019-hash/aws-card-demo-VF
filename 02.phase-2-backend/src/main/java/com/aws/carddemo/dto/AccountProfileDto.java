package com.aws.carddemo.dto;

import java.util.List;

public record AccountProfileDto(AccountDto account, CustomerDto customer, List<CreditCardDto> cards) { }
