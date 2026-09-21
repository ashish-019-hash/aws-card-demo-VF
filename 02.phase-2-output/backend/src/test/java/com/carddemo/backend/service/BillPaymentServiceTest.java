package com.carddemo.backend.service;

import com.carddemo.backend.dto.BillPaymentRequest;
import com.carddemo.backend.dto.BillPaymentResponse;
import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

/** Unit tests for BillPaymentService (COBIL00C, BR-011/BR-012, VR-095/096/097). */
@ExtendWith(MockitoExtension.class)
class BillPaymentServiceTest {

    @Mock
    private AccountRepository accountRepository;
    @Mock
    private CardXrefRepository cardXrefRepository;
    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private TransactionService transactionService;

    private BillPaymentService service;

    @BeforeEach
    void setUp() {
        service = new BillPaymentService(accountRepository, cardXrefRepository, transactionRepository,
                transactionService);
    }

    @Test
    void rejectsMissingAccountId() {
        BillPaymentResponse resp = service.pay(new BillPaymentRequest(null, "Y"));
        assertThat(resp.paid()).isFalse();
        assertThat(resp.message()).contains("Acct ID can NOT be empty");
    }

    @Test
    void rejectsBlankConfirm() {
        BillPaymentResponse resp = service.pay(new BillPaymentRequest(1L, ""));
        assertThat(resp.paid()).isFalse();
        assertThat(resp.message()).contains("Confirm to make a bill payment");
    }

    @Test
    void confirmNIsANoOpWithNoErrorMessage() {
        BillPaymentResponse resp = service.pay(new BillPaymentRequest(1L, "N"));
        assertThat(resp.paid()).isFalse();
        assertThat(resp.message()).isEmpty();
        verify(accountRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void rejectsInvalidConfirmValue() {
        BillPaymentResponse resp = service.pay(new BillPaymentRequest(1L, "X"));
        assertThat(resp.paid()).isFalse();
        assertThat(resp.message()).contains("Invalid value. Valid values are (Y/N)");
    }

    @Test
    void confirmedPaymentWithZeroBalanceHasNothingToPay() {
        Account account = new Account();
        account.setAcctId(1L);
        account.setCurrBal(BigDecimal.ZERO);
        when(accountRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(account));

        BillPaymentResponse resp = service.pay(new BillPaymentRequest(1L, "Y"));

        assertThat(resp.paid()).isFalse();
        assertThat(resp.message()).contains("You have nothing to pay");
    }

    @Test
    void unknownAccountThrowsNotFound() {
        when(accountRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.pay(new BillPaymentRequest(99L, "Y")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void confirmedPaymentPaysFullBalanceAndZeroesAccount() {
        Account account = new Account();
        account.setAcctId(1L);
        account.setCurrBal(new BigDecimal("55.00"));
        when(accountRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(account));

        CardXref xref = new CardXref();
        xref.setCardNum("4111111111111111");
        xref.setAcctId(1L);
        when(cardXrefRepository.findFirstByAcctId(1L)).thenReturn(Optional.of(xref));
        when(transactionService.nextTranId()).thenReturn("0000000000000001");

        BillPaymentResponse resp = service.pay(new BillPaymentRequest(1L, "Y"));

        assertThat(resp.paid()).isTrue();
        assertThat(resp.tranId()).isEqualTo("0000000000000001");
        assertThat(resp.amountPaid()).isEqualByComparingTo("55.00");
        assertThat(resp.newBalance()).isEqualByComparingTo("0.00");
        assertThat(account.getCurrBal()).isEqualByComparingTo("0.00");
        verify(transactionRepository).save(any());
        verify(accountRepository).save(account);
    }
}
