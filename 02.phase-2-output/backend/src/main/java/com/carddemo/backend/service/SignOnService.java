package com.carddemo.backend.service;

import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.repository.ApplicationUserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

/**
 * BR-001 (sign-on credential match) and BR-002 (admin vs. regular routing).
 *
 * <p><b>Preserved legacy quirk (BR-001):</b> both the typed User ID and the typed
 * Password are upper-cased before use (mirroring {@code COSGN00C.cbl:132-135}). The
 * User ID lookup is therefore effectively case-insensitive, but the stored password
 * ({@code SEC-USR-PWD}) is compared byte-for-byte against the upper-cased typed value —
 * so a password containing lowercase letters, once stored, can never be matched by a
 * user typing it. This is intentionally NOT fixed here; it is reproduced as observed.</p>
 */
@Service
public class SignOnService {

    private final ApplicationUserRepository userRepository;

    public SignOnService(ApplicationUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * @throws BadCredentialsException with the exact legacy message text for each of the
     *         three observed outcomes: user not found, wrong password, other lookup error.
     */
    public ApplicationUser signOn(String rawUserId, String rawPassword) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new BadCredentialsException("User not found. Try again ...");
        }
        String userId = rawUserId.toUpperCase(Locale.ROOT).trim();
        String password = rawPassword == null ? "" : rawPassword.toUpperCase(Locale.ROOT);

        Optional<ApplicationUser> found = userRepository.findById(userId);
        if (found.isEmpty()) {
            throw new BadCredentialsException("User not found. Try again ...");
        }
        ApplicationUser user = found.get();
        if (!user.getPassword().equals(password)) {
            throw new BadCredentialsException("Wrong Password. Try again ...");
        }
        return user;
    }

    /** BR-002: 'A' routes to the admin menu, anything else routes to the regular menu. */
    public boolean isAdminRouting(ApplicationUser user) {
        return user.isAdmin();
    }
}
