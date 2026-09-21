package com.carddemo.backend.service;

import com.carddemo.backend.dto.CardDetail;
import com.carddemo.backend.dto.CardFields;
import com.carddemo.backend.dto.CardListResponse;
import com.carddemo.backend.dto.CardSummary;
import com.carddemo.backend.dto.CardUpdateRequest;
import com.carddemo.backend.dto.CardUpdateResponse;
import com.carddemo.backend.entity.Card;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.repository.CardRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Card List (COCRDLIC): BR-014 (optional, additive account/card filters) + BR-015 (page
 * size 7). Card View/Update (COCRDSLC/COCRDUPC): BR-009 (lock -&gt; conflict-check -&gt;
 * rewrite, single file).
 *
 * <p><b>BR-009 modernization note:</b> the legacy routine refreshes its in-memory "old"
 * baseline with freshly-read values on a conflict, so the next save attempt on the same
 * screen compares against up-to-date data (unlike the account-update asymmetry noted in
 * BR-007). This REST API is stateless between requests: a client that gets a 409 has no
 * baseline to refresh anyway and must call GET /api/cards/{cardNumber} again to obtain a
 * fresh snapshot before retrying — which achieves the same effect.</p>
 */
@Service
public class CardService {

    private final CardRepository cardRepository;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    @Transactional(readOnly = true)
    public CardListResponse search(Long acctId, String cardNum, int page) {
        Page<Card> result = cardRepository.search(acctId, cardNum,
                PageRequest.of(Math.max(page, 0), PageSizes.CARDS));
        List<CardSummary> items = result.getContent().stream()
                .map(c -> new CardSummary(c.getCardNum(), c.getAcctId(), c.getEmbossedName(), c.getActiveStatus()))
                .toList();
        return new CardListResponse(items, page, PageSizes.CARDS, result.hasNext(), page > 0);
    }

    @Transactional(readOnly = true)
    public CardDetail getCard(String cardNum) {
        Card card = cardRepository.findById(cardNum)
                .orElseThrow(() -> new NotFoundException("Card number NOT found..."));
        return toDetail(card);
    }

    @Transactional
    public CardUpdateResponse updateCard(String cardNum, CardUpdateRequest request) {
        if (fieldsEqual(request.expected(), request.updated())) {
            return new CardUpdateResponse(false, getCard(cardNum));
        }

        Card card = cardRepository.findByIdForUpdate(cardNum)
                .orElseThrow(() -> new NotFoundException("Card number NOT found..."));

        CardFields live = toFields(card);
        if (!fieldsEqual(live, request.expected())) {
            throw new ConflictException(
                    "DATA_CHANGED: This record has been changed by another user since it was read. "
                            + "Please review the current values and try again.");
        }

        card.setCvvCd(request.updated().cvvCd());
        card.setEmbossedName(request.updated().embossedName());
        card.setExpirationDate(request.updated().expirationDate());
        card.setActiveStatus(request.updated().activeStatus());
        try {
            cardRepository.save(card);
        } catch (RuntimeException e) {
            throw new ConflictException("UPDATE_FAILED: The update could not be saved. Please try again.");
        }

        return new CardUpdateResponse(true, toDetail(card));
    }

    private boolean fieldsEqual(CardFields a, CardFields b) {
        return Objects.equals(a.cvvCd(), b.cvvCd())
                && Objects.equals(a.embossedName(), b.embossedName())
                && Objects.equals(a.expirationDate(), b.expirationDate())
                && Objects.equals(a.activeStatus(), b.activeStatus());
    }

    private CardFields toFields(Card c) {
        return new CardFields(c.getCvvCd(), c.getEmbossedName(), c.getExpirationDate(), c.getActiveStatus());
    }

    private CardDetail toDetail(Card c) {
        return new CardDetail(c.getCardNum(), c.getAcctId(), toFields(c));
    }
}
