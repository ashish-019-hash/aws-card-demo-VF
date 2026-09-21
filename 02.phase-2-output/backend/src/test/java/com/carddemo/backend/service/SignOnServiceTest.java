package com.carddemo.backend.service;

import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.repository.ApplicationUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/** BR-001 (sign-on credential match, incl. the upper-case password quirk) / BR-002 (routing). */
@ExtendWith(MockitoExtension.class)
class SignOnServiceTest {

    @Mock
    private ApplicationUserRepository userRepository;

    private SignOnService service;

    private ApplicationUser adminUser() {
        ApplicationUser u = new ApplicationUser();
        u.setUserId("ADMIN001");
        u.setFirstName("ADMIN");
        u.setLastName("USER");
        u.setPassword("PASSWORD");
        u.setUserType("A");
        return u;
    }

    @Test
    void signOnSucceedsWithMatchingUppercasedCredentials() {
        service = new SignOnService(userRepository);
        when(userRepository.findById("ADMIN001")).thenReturn(Optional.of(adminUser()));

        ApplicationUser result = service.signOn("admin001", "password");

        assertThat(result.getUserId()).isEqualTo("ADMIN001");
        assertThat(result.isAdmin()).isTrue();
    }

    @Test
    void signOnRejectsUnknownUser() {
        service = new SignOnService(userRepository);
        when(userRepository.findById("NOBODY01")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.signOn("nobody01", "x"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("User not found. Try again ...");
    }

    @Test
    void signOnRejectsBlankUserId() {
        service = new SignOnService(userRepository);

        assertThatThrownBy(() -> service.signOn("", "x"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("User not found. Try again ...");
    }

    @Test
    void signOnRejectsWrongPassword() {
        service = new SignOnService(userRepository);
        when(userRepository.findById("ADMIN001")).thenReturn(Optional.of(adminUser()));

        assertThatThrownBy(() -> service.signOn("admin001", "wrong"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Wrong Password. Try again ...");
    }

    /**
     * BR-001 preserved legacy quirk: a stored password containing lowercase letters can
     * never be matched, because the typed password is always upper-cased before compare.
     */
    @Test
    void signOnRejectsLowercaseStoredPasswordEvenIfTypedExactly() {
        service = new SignOnService(userRepository);
        ApplicationUser u = adminUser();
        u.setPassword("MixedCase"); // stored with lowercase letters
        when(userRepository.findById("ADMIN001")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> service.signOn("admin001", "MixedCase"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Wrong Password. Try again ...");
    }
}
