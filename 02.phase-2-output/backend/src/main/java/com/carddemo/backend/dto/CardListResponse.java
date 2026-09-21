package com.carddemo.backend.dto;

import java.util.List;

/** Page response for GET /api/cards — page size fixed at 7 (BR-015). */
public record CardListResponse(List<CardSummary> items, int page, int pageSize, boolean hasNext,
                                boolean hasPrevious) {
}
