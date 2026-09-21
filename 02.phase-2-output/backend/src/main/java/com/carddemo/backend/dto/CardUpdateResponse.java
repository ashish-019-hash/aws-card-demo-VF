package com.carddemo.backend.dto;

public record CardUpdateResponse(boolean changed, CardDetail card) {
}
