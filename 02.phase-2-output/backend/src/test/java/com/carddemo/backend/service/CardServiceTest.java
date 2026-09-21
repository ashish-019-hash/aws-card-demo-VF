package com.carddemo.backend.service;

import com.carddemo.backend.dto.CardFields;
import com.carddemo.backend.dto.CardUpdateRequest;
import com.carddemo.backend.dto.CardUpdateResponse;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.repository.CardRepository;
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

/** Unit tests for CardService.updateCard (COCRDUPC, BR-009). */
@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    private static final String CARD_NUM = "4111111111111111";

    @Mock
    private CardRepository cardRepository;

    private CardService service;

    @BeforeEach
    void setUp() {
        service = new CardService(cardRepository);
    }

    private Card cardEntity() {
        Card c = new Card();
        c.setCardNum(CARD_NUM);
        c.setAcctId(1L);
        c.setCvvCd(123);
        c.setEmbossedName("JOHN DOE");
        c.setExpirationDate("2099-12-31");
        c.setActiveStatus("Y");
        return c;
    }

    private CardFields fields(String embossedName) {
        return new CardFields(123, embossedName, "2099-12-31", "Y");
    }

    @Test
    void noOpUpdateReturnsUnchangedWithoutWriting() {
        CardFields same = fields("JOHN DOE");
        when(cardRepository.findById(CARD_NUM)).thenReturn(Optional.of(cardEntity()));

        CardUpdateResponse resp = service.updateCard(CARD_NUM, new CardUpdateRequest(same, same));

        assertThat(resp.changed()).isFalse();
        verify(cardRepository, never()).save(any());
    }

    @Test
    void staleSnapshotIsRejectedAsDataChangedConflict() {
        CardFields staleExpected = fields("OLD NAME");
        CardFields updated = fields("NEW NAME");
        when(cardRepository.findByIdForUpdate(CARD_NUM)).thenReturn(Optional.of(cardEntity()));

        assertThatThrownBy(() -> service.updateCard(CARD_NUM, new CardUpdateRequest(staleExpected, updated)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("DATA_CHANGED");
        verify(cardRepository, never()).save(any());
    }

    @Test
    void matchingSnapshotAppliesUpdateAndSaves() {
        CardFields expected = fields("JOHN DOE");
        CardFields updated = fields("JANE DOE");
        Card card = cardEntity();
        when(cardRepository.findByIdForUpdate(CARD_NUM)).thenReturn(Optional.of(card));

        CardUpdateResponse resp = service.updateCard(CARD_NUM, new CardUpdateRequest(expected, updated));

        assertThat(resp.changed()).isTrue();
        assertThat(card.getEmbossedName()).isEqualTo("JANE DOE");
        verify(cardRepository).save(card);
    }

    @Test
    void writeFailureIsReportedAsUpdateFailedConflict() {
        CardFields expected = fields("JOHN DOE");
        CardFields updated = fields("JANE DOE");
        Card card = cardEntity();
        when(cardRepository.findByIdForUpdate(CARD_NUM)).thenReturn(Optional.of(card));
        when(cardRepository.save(card)).thenThrow(new RuntimeException("db error"));

        assertThatThrownBy(() -> service.updateCard(CARD_NUM, new CardUpdateRequest(expected, updated)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("UPDATE_FAILED");
    }

    @Test
    void unknownCardOnUpdateThrowsNotFound() {
        CardFields expected = fields("JOHN DOE");
        CardFields updated = fields("JANE DOE");
        when(cardRepository.findByIdForUpdate(CARD_NUM)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateCard(CARD_NUM, new CardUpdateRequest(expected, updated)))
                .isInstanceOf(NotFoundException.class);
    }
}
