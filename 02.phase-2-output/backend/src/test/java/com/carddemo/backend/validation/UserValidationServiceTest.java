package com.carddemo.backend.validation;

import com.carddemo.backend.dto.UserRequest;
import com.carddemo.backend.exception.ValidationFailedException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** VR-116..VR-126 User Add/Update field validation unit tests. */
class UserValidationServiceTest {

    private final UserValidationService service = new UserValidationService();

    @Test
    void createAcceptsFullyValidRequest() {
        service.validateForCreate(new UserRequest("USER0002", "JANE", "SMITH", "PASSWORD", "U"));
    }

    @Test
    void createRejectsMissingUserId() {
        UserRequest r = new UserRequest("", "JANE", "SMITH", "PASSWORD", "U");
        assertThatThrownBy(() -> service.validateForCreate(r))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-118")));
    }

    @Test
    void createRejectsMissingPassword() {
        UserRequest r = new UserRequest("USER0002", "JANE", "SMITH", "", "U");
        assertThatThrownBy(() -> service.validateForCreate(r))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-119")));
    }

    @Test
    void updateAcceptsFullyValidRequest() {
        service.validateForUpdate(new UserRequest("USER0002", "JANE", "SMITH", "PASSWORD", "U"));
    }

    @Test
    void updateRejectsMissingUserType() {
        UserRequest r = new UserRequest("USER0002", "JANE", "SMITH", "PASSWORD", "");
        assertThatThrownBy(() -> service.validateForUpdate(r))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-126")));
    }
}
