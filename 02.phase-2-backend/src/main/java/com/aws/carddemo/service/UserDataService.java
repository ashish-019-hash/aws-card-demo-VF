package com.aws.carddemo.service;

import com.aws.carddemo.dto.UserDto;
import com.aws.carddemo.dto.UserRequest;
import com.aws.carddemo.entity.ApplicationUser;
import com.aws.carddemo.exception.ResourceConflictException;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.ApplicationUserRepository;
import com.aws.carddemo.security.SessionRevocationService;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDataService {
    private final ApplicationUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final LegacyInputValidator validator;
    private final SessionRevocationService sessionRevocation;
    public UserDataService(ApplicationUserRepository repository, PasswordEncoder passwordEncoder, LegacyInputValidator validator, SessionRevocationService sessionRevocation) { this.repository = repository; this.passwordEncoder = passwordEncoder; this.validator = validator; this.sessionRevocation = sessionRevocation; }

    @Transactional(readOnly = true) public Page<UserDto> findAll(Pageable pageable) { return repository.findAll(pageable).map(this::toDto); }
    @Transactional(readOnly = true) public UserDto find(String id) { return toDto(entity(normalizedId(id))); }

    @Transactional
    public UserDto create(String id, UserRequest r) {
        String userId = normalizedId(id); validator.user(r, true);
        if (repository.existsById(userId)) throw new ResourceConflictException("User already exists: " + userId);
        if (r.password() == null || r.password().isBlank()) throw new IllegalArgumentException("Password is required for a new user");
        ApplicationUser user = new ApplicationUser(); user.setId(userId); copy(r, user, true);
        return toDto(repository.save(user));
    }

    @Transactional
    public UserDto update(String id, UserRequest r) {
        String userId = normalizedId(id); validator.user(r, true);
        ApplicationUser user = entity(userId);
        boolean credentialsChanged = !Objects.equals(user.getUserType(), r.userType().toUpperCase())
                || !passwordEncoder.matches(r.password(), user.getPasswordHash());
        boolean changed = credentialsChanged || !Objects.equals(user.getFirstName(), r.firstName()) || !Objects.equals(user.getLastName(), r.lastName());
        if (!changed) throw new IllegalArgumentException("At least one user field must change");
        copy(r, user, true);
        UserDto dto = toDto(repository.save(user));
        if (credentialsChanged) sessionRevocation.revokeSessions(userId);
        return dto;
    }

    @Transactional
    public void delete(String id) {
        String userId = normalizedId(id);
        repository.delete(entity(userId));
        sessionRevocation.revokeSessions(userId);
    }

    private String normalizedId(String id) { validator.userId(id); return id.toUpperCase(); }

    private void copy(UserRequest r, ApplicationUser user, boolean passwordRequired) {
        user.setFirstName(r.firstName()); user.setLastName(r.lastName()); user.setUserType(r.userType().toUpperCase());
        if (r.password() != null && !r.password().isBlank()) user.setPasswordHash(passwordEncoder.encode(r.password()));
        else if (passwordRequired) throw new IllegalArgumentException("Password is required");
    }
    private ApplicationUser entity(String id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id)); }
    private UserDto toDto(ApplicationUser u) { return new UserDto(u.getId(), u.getFirstName(), u.getLastName(), u.getUserType()); }
}
