package com.carddemo.backend.service;

import com.carddemo.backend.dto.UserRequest;
import com.carddemo.backend.dto.UserResponse;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.exception.ValidationFailedException;
import com.carddemo.backend.repository.ApplicationUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for UserAdminService (COUSR01C/02C/03C, BR-016). */
@ExtendWith(MockitoExtension.class)
class UserAdminServiceTest {

    @Mock
    private ApplicationUserRepository userRepository;

    private UserAdminService service;

    @BeforeEach
    void setUp() {
        service = new UserAdminService(userRepository);
    }

    @Test
    void createSucceedsWhenUserIdIsNew() {
        when(userRepository.existsById("NEWUSR01")).thenReturn(false);

        UserResponse resp = service.create(new UserRequest("NEWUSR01", "JOHN", "DOE", "PASSWORD", "U"));

        assertThat(resp.userId()).isEqualTo("NEWUSR01");
        verify(userRepository).saveAndFlush(any());
    }

    @Test
    void createRejectsDuplicateUserId() {
        when(userRepository.existsById("ADMIN001")).thenReturn(true);

        assertThatThrownBy(() -> service.create(new UserRequest("ADMIN001", "A", "B", "PASSWORD", "A")))
                .isInstanceOf(ConflictException.class);
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void createRejectsWhenSaveAndFlushHitsUniqueConstraintRace() {
        // Simulates a genuine race: existsById passes for both concurrent callers, but the
        // second saveAndFlush() hits the DB-level unique constraint on users_pkey.
        when(userRepository.existsById("RACEUSR1")).thenReturn(false);
        when(userRepository.saveAndFlush(any()))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key"));

        assertThatThrownBy(() -> service.create(new UserRequest("RACEUSR1", "A", "B", "PASSWORD", "U")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("User ID already exist");
    }

    @Test
    void updateRejectsNoOpChange() {
        ApplicationUser existing = new ApplicationUser();
        existing.setUserId("USER0001");
        existing.setFirstName("JOHN");
        existing.setLastName("DOE");
        existing.setPassword("PASSWORD");
        existing.setUserType("U");
        when(userRepository.findById("USER0001")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.update("USER0001",
                new UserRequest("USER0001", "JOHN", "DOE", "PASSWORD", "U")))
                .isInstanceOf(ValidationFailedException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateSavesWhenAFieldChanges() {
        ApplicationUser existing = new ApplicationUser();
        existing.setUserId("USER0001");
        existing.setFirstName("JOHN");
        existing.setLastName("DOE");
        existing.setPassword("PASSWORD");
        existing.setUserType("U");
        when(userRepository.findById("USER0001")).thenReturn(Optional.of(existing));

        UserResponse resp = service.update("USER0001",
                new UserRequest("USER0001", "JOHN", "SMITH", "PASSWORD", "U"));

        assertThat(resp.lastName()).isEqualTo("SMITH");
        verify(userRepository).save(existing);
    }

    @Test
    void updateUnknownUserThrowsNotFound() {
        when(userRepository.findById("NOBODY01")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update("NOBODY01",
                new UserRequest("NOBODY01", "A", "B", "PASSWORD", "U")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteUnknownUserThrowsNotFound() {
        when(userRepository.findById("NOBODY01")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete("NOBODY01")).isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteRemovesExistingUser() {
        ApplicationUser existing = new ApplicationUser();
        existing.setUserId("USER0001");
        when(userRepository.findById("USER0001")).thenReturn(Optional.of(existing));

        service.delete("USER0001");

        verify(userRepository).delete(existing);
    }
}
