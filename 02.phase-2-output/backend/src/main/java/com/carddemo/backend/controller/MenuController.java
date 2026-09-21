package com.carddemo.backend.controller;

import com.carddemo.backend.dto.MenuResponse;
import com.carddemo.backend.security.AppUserPrincipal;
import com.carddemo.backend.service.MenuService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/menu — BR-002/BR-003: the options available for the caller's role. */
@RestController
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/api/menu")
    public MenuResponse menu(@AuthenticationPrincipal AppUserPrincipal principal) {
        return menuService.menuFor(principal.getUserType());
    }
}
