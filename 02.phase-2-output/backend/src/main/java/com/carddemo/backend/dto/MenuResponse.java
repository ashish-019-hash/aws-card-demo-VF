package com.carddemo.backend.dto;

import java.util.List;

/** Response body for GET /api/menu — the options available for the caller's role (BR-002/BR-003). */
public record MenuResponse(String userType, List<MenuOption> options) {

    public record MenuOption(int number, String label, String targetScreen) {
    }
}
