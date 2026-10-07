package com.aws.carddemo.security;

import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

/**
 * UserDetails that carries the persisted per-user security stamp captured at login.
 * {@link UserSecurityVersionFilter} compares it against the database on every authenticated
 * request, so sessions established with stale credentials or roles are rejected even when a
 * concurrent login escapes registry-based revocation, and a session for a deleted-and-recreated
 * user ID can never match the new incarnation's stamp.
 */
public class CardDemoUserDetails extends User {
    private final String securityStamp;

    public CardDemoUserDetails(String username, String passwordHash, String securityStamp,
            Collection<? extends GrantedAuthority> authorities) {
        super(username, passwordHash, authorities);
        this.securityStamp = securityStamp;
    }

    public String getSecurityStamp() { return securityStamp; }
}
