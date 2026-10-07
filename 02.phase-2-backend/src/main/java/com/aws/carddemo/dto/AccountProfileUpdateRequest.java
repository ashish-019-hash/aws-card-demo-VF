package com.aws.carddemo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Combined SCREEN-05 (COACTUPC) save: the legacy program rewrites the account and the
 * customer record in one unit of work and rolls both back when either write fails.
 */
public record AccountProfileUpdateRequest(
        @NotNull @Valid AccountRequest account,
        @NotNull @Valid CustomerRequest customer) { }
