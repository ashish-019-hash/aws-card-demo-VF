package com.aws.carddemo.security;

import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

/**
 * Expires every active session belonging to a user. Expired sessions are rejected (401) and
 * invalidated by the concurrent-session filter on the next request, so credential, role, and
 * existence changes take effect immediately for already-authenticated sessions.
 */
@Service
public class SessionRevocationService {
    private final SessionRegistry sessionRegistry;
    public SessionRevocationService(SessionRegistry sessionRegistry) { this.sessionRegistry = sessionRegistry; }

    public void revokeSessions(String userId) {
        sessionRegistry.getAllPrincipals().stream()
                .filter(principal -> principal instanceof UserDetails details && details.getUsername().equalsIgnoreCase(userId))
                .flatMap(principal -> sessionRegistry.getAllSessions(principal, false).stream())
                .forEach(SessionInformation::expireNow);
    }
}
