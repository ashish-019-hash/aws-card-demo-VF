package com.carddemo.backend.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Objects;

/**
 * The authenticated principal stored in the HTTP session after a successful
 * sign-on (BR-001/BR-002). {@code userType} is {@code A} (Admin) or {@code U} (Regular).
 */
public class AppUserPrincipal {

    private final String userId;
    private final String firstName;
    private final String lastName;
    private final String userType;

    public AppUserPrincipal(String userId, String firstName, String lastName, String userType) {
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.userType = userType;
    }

    public String getUserId() { return userId; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getUserType() { return userType; }
    public boolean isAdmin() { return "A".equals(userType); }

    public List<GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority(isAdmin() ? "ROLE_ADMIN" : "ROLE_USER"));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AppUserPrincipal that)) return false;
        return Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() { return Objects.hash(userId); }
}
