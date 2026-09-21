package com.carddemo.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "carddemo.security")
public class SecurityProperties {

    /** Whether the CSRF cookie should be marked Secure (true in prod, false in dev/test). */
    private boolean csrfCookieSecure = true;

    public boolean isCsrfCookieSecure() { return csrfCookieSecure; }
    public void setCsrfCookieSecure(boolean csrfCookieSecure) { this.csrfCookieSecure = csrfCookieSecure; }
}
