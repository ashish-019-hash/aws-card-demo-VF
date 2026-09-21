package com.carddemo.backend.service;

import com.carddemo.backend.dto.UserListResponse;
import com.carddemo.backend.dto.UserRequest;
import com.carddemo.backend.dto.UserResponse;
import com.carddemo.backend.entity.ApplicationUser;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.exception.ValidationFailedException;
import com.carddemo.backend.exception.FieldError;
import com.carddemo.backend.repository.ApplicationUserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * User Administration (COUSR00C-COUSR03C, admin-only): BR-015 (page size 10) and BR-016
 * (uniqueness on Add, no-op guard on Update, delete is a distinct explicit action).
 */
@Service
public class UserAdminService {

    private final ApplicationUserRepository userRepository;

    public UserAdminService(ApplicationUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public UserListResponse list(int page) {
        Page<ApplicationUser> result = userRepository.findAllByOrderByUserIdAsc(PageRequest.of(Math.max(page, 0),
                PageSizes.USERS));
        List<UserListResponse.UserSummary> items = result.getContent().stream()
                .map(u -> new UserListResponse.UserSummary(u.getUserId(), u.getFirstName(), u.getLastName(),
                        u.getUserType()))
                .toList();
        return new UserListResponse(items, result.hasNext(), page > 0);
    }

    @Transactional(readOnly = true)
    public UserResponse get(String userId) {
        return toResponse(findOrThrow(userId));
    }

    /** BR-016 Add: User ID uniqueness is a hard constraint (users_pkey). */
    @Transactional
    public UserResponse create(UserRequest request) {
        if (userRepository.existsById(request.userId())) {
            throw new ConflictException("User ID already exist...");
        }
        ApplicationUser user = new ApplicationUser();
        user.setUserId(request.userId());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPassword(request.password());
        user.setUserType(request.userType());
        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("User ID already exist...");
        }
        return toResponse(user);
    }

    /** BR-016 Update: rejects a no-op change (nothing actually differs) without writing. */
    @Transactional
    public UserResponse update(String userId, UserRequest request) {
        ApplicationUser user = findOrThrow(userId);
        boolean modified = !Objects.equals(user.getFirstName(), request.firstName())
                || !Objects.equals(user.getLastName(), request.lastName())
                || !Objects.equals(user.getPassword(), request.password())
                || !Objects.equals(user.getUserType(), request.userType());
        if (!modified) {
            throw new ValidationFailedException(List.of(new FieldError("*", "VR-121",
                    "Please modify to update ...")));
        }
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPassword(request.password());
        user.setUserType(request.userType());
        userRepository.save(user);
        return toResponse(user);
    }

    /**
     * BR-16 Delete: on the legacy screen, pressing Enter with a User ID only fetches and
     * displays the target user (no delete); PF5 is the confirmation gesture that actually
     * commits the delete. This REST API has no PF-key equivalent, so the client must call
     * GET /api/users/{userId} first (read-only lookup) and only call this DELETE endpoint
     * once the operator has confirmed on their side — DELETE itself is the "PF5" action.
     */
    @Transactional
    public void delete(String userId) {
        ApplicationUser user = findOrThrow(userId);
        userRepository.delete(user);
    }

    private ApplicationUser findOrThrow(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User ID NOT found..."));
    }

    private UserResponse toResponse(ApplicationUser u) {
        return new UserResponse(u.getUserId(), u.getFirstName(), u.getLastName(), u.getUserType());
    }
}
