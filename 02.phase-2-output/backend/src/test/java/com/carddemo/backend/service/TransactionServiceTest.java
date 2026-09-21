package com.carddemo.backend.service;

import com.carddemo.backend.dto.TransactionAddRequest;
import com.carddemo.backend.dto.TransactionAddResponse;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.TranIdAllocator;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.exception.ValidationFailedException;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.TranIdAllocatorRepository;
import com.carddemo.backend.repository.TransactionRepository;
import com.carddemo.backend.validation.TransactionValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
                .isInstanceOf(NotFoundException.class);
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
