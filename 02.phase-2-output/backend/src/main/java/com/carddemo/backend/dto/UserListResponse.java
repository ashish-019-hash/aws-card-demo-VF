package com.carddemo.backend.dto;

import java.util.List;

public record UserListResponse(List<UserSummary> items, boolean hasNext, boolean hasPrevious) {

    public record UserSummary(String userId, String firstName, String lastName, String userType) {
    }
}
