package com.aws.carddemo.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AccessRulesTest {
    private final AccessRules rules = new AccessRules();

    @Test
    void ruleDecision002RoutesUsersByRole() {
        assertThat(rules.entryPointFor("A")).isEqualTo(AccessRules.EntryPoint.ADMIN_MENU);
        assertThat(rules.entryPointFor("U")).isEqualTo(AccessRules.EntryPoint.MAIN_MENU);
    }

    @Test
    void ruleDecision003DeniesAdminOnlyFunctionsToRegularUsers() {
        assertThat(rules.canAccess("U", "A")).isFalse();
        assertThat(rules.canAccess("U", "U")).isTrue();
        assertThat(rules.canAccess("A", "A")).isTrue();
    }
}
