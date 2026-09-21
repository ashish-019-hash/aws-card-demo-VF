package com.carddemo.backend.validation;

import com.carddemo.backend.dto.TransactionAddRequest;
import com.carddemo.backend.exception.ValidationFailedException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** VR-075..VR-093 Transaction Add field validation unit tests. */
class TransactionValidationServiceTest {

    private final TransactionValidationService service = new TransactionValidationService();

    private TransactionAddRequest valid() {
        return new TransactionAddRequest(1L, null, "02", 2, "POS TERM", "PURCHASE",
                new BigDecimal("12.34"), "2022-06-10", "2022-06-10", 999999999L,
                "ACME STORE", "RALEIGH", "27601", "Y");
    }

    @Test
    void acceptsFullyValidRequest() {
        service.validate(valid()); // must not throw
    }

    @Test
    void rejectsBlankTypeCd() {
        TransactionAddRequest r = valid();
        TransactionAddRequest bad = new TransactionAddRequest(r.accountId(), r.cardNum(), "", r.catCd(),
                r.source(), r.description(), r.amount(), r.origDate(), r.procDate(), r.merchantId(),
                r.merchantName(), r.merchantCity(), r.merchantZip(), r.confirm());
        assertThatThrownBy(() -> service.validate(bad))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-075")));
    }

    @Test
    void rejectsMissingCategory() {
        TransactionAddRequest r = valid();
        TransactionAddRequest bad = new TransactionAddRequest(r.accountId(), r.cardNum(), r.typeCd(), null,
                r.source(), r.description(), r.amount(), r.origDate(), r.procDate(), r.merchantId(),
                r.merchantName(), r.merchantCity(), r.merchantZip(), r.confirm());
        assertThatThrownBy(() -> service.validate(bad))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-076")));
    }

    @Test
    void rejectsMissingAmount() {
        TransactionAddRequest r = valid();
        TransactionAddRequest bad = new TransactionAddRequest(r.accountId(), r.cardNum(), r.typeCd(), r.catCd(),
                r.source(), r.description(), null, r.origDate(), r.procDate(), r.merchantId(),
                r.merchantName(), r.merchantCity(), r.merchantZip(), r.confirm());
        assertThatThrownBy(() -> service.validate(bad))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-079")));
    }

    @Test
    void rejectsAmountWithTooManyDecimals() {
        TransactionAddRequest r = valid();
        TransactionAddRequest bad = new TransactionAddRequest(r.accountId(), r.cardNum(), r.typeCd(), r.catCd(),
                r.source(), r.description(), new BigDecimal("12.345"), r.origDate(), r.procDate(), r.merchantId(),
                r.merchantName(), r.merchantCity(), r.merchantZip(), r.confirm());
        assertThatThrownBy(() -> service.validate(bad))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-088")));
    }

    @Test
    void rejectsBadOrigDateFormat() {
        TransactionAddRequest r = valid();
        TransactionAddRequest bad = new TransactionAddRequest(r.accountId(), r.cardNum(), r.typeCd(), r.catCd(),
                r.source(), r.description(), r.amount(), "06/10/2022", r.procDate(), r.merchantId(),
                r.merchantName(), r.merchantCity(), r.merchantZip(), r.confirm());
        assertThatThrownBy(() -> service.validate(bad))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> assertThat(((ValidationFailedException) e).getErrors())
                        .anySatisfy(err -> assertThat(err.rule()).isEqualTo("VR-089")));
    }

    @Test
    void rejectsMissingMerchantFields() {
        TransactionAddRequest r = valid();
        TransactionAddRequest bad = new TransactionAddRequest(r.accountId(), r.cardNum(), r.typeCd(), r.catCd(),
                r.source(), r.description(), r.amount(), r.origDate(), r.procDate(), null,
                "", "", "", r.confirm());
        assertThatThrownBy(() -> service.validate(bad))
                .isInstanceOf(ValidationFailedException.class)
                .satisfies(e -> {
                    var rules = ((ValidationFailedException) e).getErrors().stream()
                            .map(err -> err.rule()).toList();
                    assertThat(rules).contains("VR-082", "VR-083", "VR-084", "VR-085");
                });
    }
}
