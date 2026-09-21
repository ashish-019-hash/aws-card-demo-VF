package com.carddemo.backend.validation;

import com.carddemo.backend.dto.CardFields;
import com.carddemo.backend.exception.ValidationFailedException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** VR-064..VR-069 Card Update validation unit tests (BR-009 upstream gate). */
class CardValidationServiceTest {

    private final CardValidationService service = new CardValidationService();

    @Test
    void acceptsFullyValidFields() {
        service.validate(new CardFields(123, "JOHN Q DOE", "2030-06-01", "Y")); // must not throw
    }

    @Test
    void rejectsBlankEmbossedName() {
        assertThatThrownBy(() -> service.validate(new CardFields(123, "", "2030-06-01", "Y")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-064")));
    }

    @Test
    void rejectsNonAlphaEmbossedName() {
        assertThatThrownBy(() -> service.validate(new CardFields(123, "JOHN3", "2030-06-01", "Y")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-065")));
    }

    @Test
    void rejectsInvalidActiveStatus() {
        assertThatThrownBy(() -> service.validate(new CardFields(123, "JOHN DOE", "2030-06-01", "X")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-066")));
    }

    @Test
    void rejectsMissingExpirationDate() {
        assertThatThrownBy(() -> service.validate(new CardFields(123, "JOHN DOE", "", "Y")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-067")));
    }

    @Test
    void rejectsExpirationYearOutOfRange() {
        assertThatThrownBy(() -> service.validate(new CardFields(123, "JOHN DOE", "1900-06-01", "Y")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-068")));
    }

    @Test
    void rejectsCvvOutOfRange() {
        assertThatThrownBy(() -> service.validate(new CardFields(-1, "JOHN DOE", "2030-06-01", "Y")))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.getRule()).isEqualTo("VR-069")));
    }
}
