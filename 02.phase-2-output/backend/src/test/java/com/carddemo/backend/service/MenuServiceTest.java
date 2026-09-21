package com.carddemo.backend.service;

import com.carddemo.backend.dto.MenuResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** BR-002/BR-003 menu routing unit tests. */
class MenuServiceTest {

    private final MenuService service = new MenuService();

    @Test
    void regularUserGetsTenRegularOptions() {
        MenuResponse menu = service.menuFor("U");
        assertThat(menu.options()).hasSize(10);
        assertThat(menu.options().get(0).targetScreen()).isEqualTo("COACTVWC");
    }

    @Test
    void adminUserGetsFourAdminOptions() {
        MenuResponse menu = service.menuFor("A");
        assertThat(menu.options()).hasSize(4);
        assertThat(menu.options().get(0).targetScreen()).isEqualTo("COUSR00C");
    }

    @Test
    void unknownUserTypeFallsBackToRegularMenu() {
        MenuResponse menu = service.menuFor("Z");
        assertThat(menu.options()).hasSize(10);
    }
}
