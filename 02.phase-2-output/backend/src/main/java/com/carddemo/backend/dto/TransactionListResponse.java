package com.carddemo.backend.dto;

import java.util.List;

public record TransactionListResponse(List<TransactionSummary> items, int pageSize, boolean hasNext,
                                       boolean hasPrevious) {
}
