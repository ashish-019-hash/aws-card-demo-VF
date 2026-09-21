package com.carddemo.backend.service;

import com.carddemo.backend.dto.TransactionAddRequest;
import com.carddemo.backend.dto.TransactionAddResponse;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.TranIdAllocator;
import com.carddemo.backend.entity.Transaction;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.exception.ValidationFailedException;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.TranIdAllocatorRepository;
import com.carddemo.backend.repository.TransactionRepository;
import com.carddemo.backend.validation.TransactionValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for TransactionService (COTRN02C, BR-010 id allocation, VR-074/VR-094). */
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private CardXrefRepository cardXrefRepository;
    @Mock
    private TranIdAllocatorRepository tranIdAllocatorRepository;
    @Mock
    private TransactionValidationService transactionValidationService;

    private TransactionService service;

    @BeforeEach
    void setUp() {
        service = new TransactionService(transactionRepository, cardXrefRepository, tranIdAllocatorRepository,
                transactionValidationService);
    }

    @Test
    void nextTranIdIncrementsAllocatorUnderLockAndZeroPads() {
        TranIdAllocator allocator = new TranIdAllocator();
        allocator.setId(1);
        allocator.setNextTranId(41L);
        when(tranIdAllocatorRepository.lockRow()).thenReturn(Optional.of(allocator));

        String id = service.nextTranId();

        assertThat(id).isEqualTo("0000000000000041");
        assertThat(allocator.getNextTranId()).isEqualTo(42L);
        verify(tranIdAllocatorRepository).save(allocator);
    }

    @Test
    void addTransactionRejectsWithoutYConfirm() {
        TransactionAddRequest req = validRequest(null, "N");

        assertThatThrownBy(() -> service.addTransaction(req))
                .isInstanceOf(ValidationFailedException.class);
        verify(transactionRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void addTransactionResolvesCardNumFromAccountWhenCardNumMissing() {
        TransactionAddRequest req = validRequest(1L, "Y");
        CardXref xref = new CardXref();
        xref.setCardNum("4111111111111111");
        xref.setAcctId(1L);
        when(cardXrefRepository.findFirstByAcctId(1L)).thenReturn(Optional.of(xref));

        TranIdAllocator allocator = new TranIdAllocator();
        allocator.setId(1);
        allocator.setNextTranId(1L);
        when(tranIdAllocatorRepository.lockRow()).thenReturn(Optional.of(allocator));

        TransactionAddResponse resp = service.addTransaction(req);

        assertThat(resp.transaction().cardNum()).isEqualTo("4111111111111111");
        verify(transactionValidationService).validate(req);
    }

    @Test
    void addTransactionRejectsWhenNeitherAccountNorCardSupplied() {
        TransactionAddRequest req = validRequestNoAccountOrCard();

        assertThatThrownBy(() -> service.addTransaction(req))
                .isInstanceOf(ValidationFailedException.class);
    }

    @Test
    void addTransactionThrowsNotFoundForUnknownAccount() {
        TransactionAddRequest req = validRequest(999L, "Y");
        when(cardXrefRepository.findFirstByAcctId(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.addTransaction(req))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Account ID NOT found");
    }

    /** Finding #1: origTs/procTs must be the request's own dates (left-justified, space-padded
     * to 26 chars), never server time — COTRN02C.cbl:464-465 moves the 10-char screen date into
     * the 26-char timestamp field verbatim. */
    @Test
    void addTransactionPersistsRequestDatesNotServerTimeAsTimestamps() {
        TransactionAddRequest req = validRequest(1L, "Y");
        CardXref xref = new CardXref();
        xref.setCardNum("4111111111111111");
        xref.setAcctId(1L);
        when(cardXrefRepository.findFirstByAcctId(1L)).thenReturn(Optional.of(xref));
        TranIdAllocator allocator = new TranIdAllocator();
        allocator.setId(1);
        allocator.setNextTranId(1L);
        when(tranIdAllocatorRepository.lockRow()).thenReturn(Optional.of(allocator));

        service.addTransaction(req);

        ArgumentCaptor<Transaction> captor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(captor.capture());
        Transaction saved = captor.getValue();
        assertThat(saved.getOrigTs()).hasSize(26).isEqualTo("2022-06-10                ");
        assertThat(saved.getProcTs()).hasSize(26).isEqualTo("2022-06-10                ");
    }

    /** Finding #2: accountId is checked before cardNum (COTRN02C.cbl VALIDATE-INPUT-KEY-FIELDS
     * EVALUATE ordering) — when both are supplied, the account id's cross-reference wins and
     * the supplied cardNum is never looked up. */
    @Test
    void addTransactionPrefersAccountIdOverSuppliedCardNumWhenBothGiven() {
        TransactionAddRequest req = new TransactionAddRequest(1L, "9999999999999999", "02", 2, "POS TERM",
                "PURCHASE", new BigDecimal("12.34"), "2022-06-10", "2022-06-10", 123456789L, "MERCHANT", "CITY",
                "12345", "Y");
        CardXref xref = new CardXref();
        xref.setCardNum("4111111111111111");
        xref.setAcctId(1L);
        when(cardXrefRepository.findFirstByAcctId(1L)).thenReturn(Optional.of(xref));
        TranIdAllocator allocator = new TranIdAllocator();
        allocator.setId(1);
        allocator.setNextTranId(1L);
        when(tranIdAllocatorRepository.lockRow()).thenReturn(Optional.of(allocator));

        TransactionAddResponse resp = service.addTransaction(req);

        assertThat(resp.transaction().cardNum()).isEqualTo("4111111111111111");
        verify(cardXrefRepository, org.mockito.Mockito.never()).existsById(any());
    }

    /** Finding #2: an unknown card number (no matching CCXREF entry) is rejected as
     * "Card Number NOT found..." (COTRN02C.cbl:626), distinct from the account-not-found
     * message. */
    @Test
    void addTransactionThrowsNotFoundForUnknownCardNumWhenNoAccountSupplied() {
        TransactionAddRequest base = validRequest(null, "Y");
        TransactionAddRequest req = new TransactionAddRequest(null, "9999999999999999", base.typeCd(),
                base.catCd(), base.source(), base.description(), base.amount(), base.origDate(), base.procDate(),
                base.merchantId(), base.merchantName(), base.merchantCity(), base.merchantZip(), base.confirm());
        when(cardXrefRepository.existsById("9999999999999999")).thenReturn(false);

        assertThatThrownBy(() -> service.addTransaction(req))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Card Number NOT found");
    }

    private TransactionAddRequest validRequest(Long accountId, String confirm) {
        return new TransactionAddRequest(accountId, null, "02", 2, "POS TERM", "PURCHASE",
                new BigDecimal("12.34"), "2022-06-10", "2022-06-10", 123456789L, "MERCHANT",
                "CITY", "12345", confirm);
    }

    private TransactionAddRequest validRequestNoAccountOrCard() {
        return new TransactionAddRequest(null, null, "02", 2, "POS TERM", "PURCHASE",
                new BigDecimal("12.34"), "2022-06-10", "2022-06-10", 123456789L, "MERCHANT",
                "CITY", "12345", "Y");
    }
}
