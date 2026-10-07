package com.aws.carddemo.security;

import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

/**
 * UserDetails that carries the persisted per-user security version captured at login.
 * {@link UserSecurityVersionFilter} compares it against the database on every authenticated
 * request, so sessions established with stale credentials or roles are rejected even when a
 * concurrent login escapes registry-based revocation.
 */
public class CardDemoUserDetails extends User {
    private final long securityVersion;

    public CardDemoUserDetails(String username, String passwordHash, long securityVersion,
            Collection<? extends GrantedAuthority> authorities) {
        super(username, passwordHash, authorities);
        this.securityVersion = securityVersion;
    }

    public long getSecurityVersion() { return securityVersion; }
}
