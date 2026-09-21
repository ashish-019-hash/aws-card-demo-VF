package com.carddemo.backend.seed;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "carddemo.seed")
public class SeedProperties {

    /** Also bindable via env var CARDDEMO_SEED_ENABLED (Spring Boot relaxed binding). */
    private boolean enabled = false;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
