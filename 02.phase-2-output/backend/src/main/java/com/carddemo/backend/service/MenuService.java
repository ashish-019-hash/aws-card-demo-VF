package com.carddemo.backend.service;

import com.carddemo.backend.dto.MenuResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * BR-002 (admin vs. regular routing) / BR-003 (admin-only option gate — currently dead
 * code: none of the 10 regular-menu options in COMEN02Y.cpy are actually flagged
 * admin-only, so every regular-menu option is available to any signed-on regular user;
 * reproduced as observed, not "fixed").
 */
@Service
public class MenuService {

    private static final List<MenuResponse.MenuOption> REGULAR_OPTIONS = List.of(
            new MenuResponse.MenuOption(1, "Account View", "COACTVWC"),
            new MenuResponse.MenuOption(2, "Account Update", "COACTUPC"),
            new MenuResponse.MenuOption(3, "Credit Card List", "COCRDLIC"),
            new MenuResponse.MenuOption(4, "Credit Card View", "COCRDSLC"),
            new MenuResponse.MenuOption(5, "Credit Card Update", "COCRDUPC"),
            new MenuResponse.MenuOption(6, "Transaction List", "COTRN00C"),
            new MenuResponse.MenuOption(7, "Transaction View", "COTRN01C"),
            new MenuResponse.MenuOption(8, "Transaction Add", "COTRN02C"),
            new MenuResponse.MenuOption(9, "Transaction Reports", "CORPT00C"),
            new MenuResponse.MenuOption(10, "Bill Payment", "COBIL00C"));

    private static final List<MenuResponse.MenuOption> ADMIN_OPTIONS = List.of(
            new MenuResponse.MenuOption(1, "User List (Security)", "COUSR00C"),
            new MenuResponse.MenuOption(2, "User Add (Security)", "COUSR01C"),
            new MenuResponse.MenuOption(3, "User Update (Security)", "COUSR02C"),
            new MenuResponse.MenuOption(4, "User Delete (Security)", "COUSR03C"));

    public MenuResponse menuFor(String userType) {
        boolean admin = "A".equals(userType);
        return new MenuResponse(userType, admin ? ADMIN_OPTIONS : REGULAR_OPTIONS);
    }
}
