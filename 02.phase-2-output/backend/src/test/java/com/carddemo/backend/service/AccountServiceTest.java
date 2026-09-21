package com.carddemo.backend.service;

import com.carddemo.backend.dto.AccountFields;
import com.carddemo.backend.dto.AccountUpdateRequest;
import com.carddemo.backend.dto.AccountUpdateResponse;
import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.CustomerRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Unit tests for AccountService.updateAccount (COACTUPC, BR-006/BR-007/BR-008). */
@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    private static final Long ACCT_ID = 1L;
    private static final Long CUST_ID = 900L;

    @Mock
    private AccountRepository accountRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private CardXrefRepository cardXrefRepository;

    private AccountService service;

    @BeforeEach
    void setUp() {
        service = new AccountService(accountRepository, customerRepository, cardXrefRepository);
    }

    private AccountFields fields(BigDecimal currBal, String lastName) {
        return new AccountFields("Y", new BigDecimal("5000.00"), new BigDecimal("1000.00"), currBal,
                BigDecimal.ZERO, BigDecimal.ZERO, "2020-01-01", "2099-12-31", "2020-01-01", "GRP1",
                "JOHN", null, lastName, "123 MAIN ST", null, null, "NC", "USA", "27601",
                "(212)555-1234", null, "123456789", null, "1980-01-01", null, "N", 720);
    }

    private Account accountEntity() {
        Account a = new Account();
        a.setAcctId(ACCT_ID);
        a.setActiveStatus("Y");
        a.setCreditLimit(new BigDecimal("5000.00"));
        a.setCashCreditLimit(new BigDecimal("1000.00"));
        a.setCurrBal(new BigDecimal("100.00"));
        a.setCurrCycCredit(BigDecimal.ZERO);
        a.setCurrCycDebit(BigDecimal.ZERO);
        a.setOpenDate("2020-01-01");
        a.setExpirationDate("2099-12-31");
        a.setReissueDate("2020-01-01");
        a.setGroupId("GRP1");
        return a;
    }

    private Customer customerEntity() {
        Customer c = new Customer();
        c.setCustId(CUST_ID);
        c.setFirstName("JOHN");
        c.setLastName("DOE");
        c.setAddrLine1("123 MAIN ST");
        c.setAddrStateCd("NC");
        c.setAddrCountryCd("USA");
        c.setAddrZip("27601");
        c.setPhoneNum1("(212)555-1234");
        c.setSsn("123456789");
        c.setDob("1980-01-01");
        c.setPriCardHolderInd("N");
        c.setFicoCreditScore(720);
        return c;
    }

    private CardXref xref() {
        CardXref x = new CardXref();
        x.setCardNum("4111111111111111");
        x.setAcctId(ACCT_ID);
        x.setCustId(CUST_ID);
        return x;
    }

    @Test
    void noOpUpdateReturnsUnchangedWithoutWriting() {
        AccountFields same = fields(new BigDecimal("100.00"), "DOE");
        when(cardXrefRepository.findFirstByAcctId(ACCT_ID)).thenReturn(Optional.of(xref()));
        when(accountRepository.findById(ACCT_ID)).thenReturn(Optional.of(accountEntity()));
        when(customerRepository.findById(CUST_ID)).thenReturn(Optional.of(customerEntity()));

        AccountUpdateResponse resp = service.updateAccount(ACCT_ID, new AccountUpdateRequest(same, same));

        assertThat(resp.changed()).isFalse();
        verify(accountRepository, never()).saveAndFlush(any());
        verify(customerRepository, never()).saveAndFlush(any());
    }

    @Test
    void staleSnapshotIsRejectedAsDataChangedConflict() {
        AccountFields staleExpected = fields(new BigDecimal("999.00"), "DOE"); // doesn't match live 100.00
        AccountFields updated = fields(new BigDecimal("200.00"), "DOE");
        when(cardXrefRepository.findFirstByAcctId(ACCT_ID)).thenReturn(Optional.of(xref()));
        when(accountRepository.findByIdForUpdate(ACCT_ID)).thenReturn(Optional.of(accountEntity()));
        when(customerRepository.findByIdForUpdate(CUST_ID)).thenReturn(Optional.of(customerEntity()));

        assertThatThrownBy(() -> service.updateAccount(ACCT_ID, new AccountUpdateRequest(staleExpected, updated)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Record changed by some one else. Please review")
                .satisfies(e -> assertThat(((ConflictException) e).getReason()).isEqualTo("DATA_CHANGED"));
        verify(accountRepository, never()).saveAndFlush(any());
    }

    @Test
    void matchingSnapshotAppliesUpdateAndSaves() {
        AccountFields expected = fields(new BigDecimal("100.00"), "DOE");
        AccountFields updated = fields(new BigDecimal("200.00"), "SMITH");
        when(cardXrefRepository.findFirstByAcctId(ACCT_ID)).thenReturn(Optional.of(xref()));
        Account account = accountEntity();
        Customer customer = customerEntity();
        when(accountRepository.findByIdForUpdate(ACCT_ID)).thenReturn(Optional.of(account));
        when(customerRepository.findByIdForUpdate(CUST_ID)).thenReturn(Optional.of(customer));

        AccountUpdateResponse resp = service.updateAccount(ACCT_ID, new AccountUpdateRequest(expected, updated));

        assertThat(resp.changed()).isTrue();
        assertThat(account.getCurrBal()).isEqualByComparingTo("200.00");
        assertThat(customer.getLastName()).isEqualTo("SMITH");
        verify(accountRepository).saveAndFlush(account);
        verify(customerRepository).saveAndFlush(customer);
    }

    @Test
    void writeFailureIsReportedAsUpdateFailedConflict() {
        AccountFields expected = fields(new BigDecimal("100.00"), "DOE");
        AccountFields updated = fields(new BigDecimal("200.00"), "SMITH");
        when(cardXrefRepository.findFirstByAcctId(ACCT_ID)).thenReturn(Optional.of(xref()));
        Account account = accountEntity();
        Customer customer = customerEntity();
        when(accountRepository.findByIdForUpdate(ACCT_ID)).thenReturn(Optional.of(account));
        when(customerRepository.findByIdForUpdate(CUST_ID)).thenReturn(Optional.of(customer));
        when(accountRepository.saveAndFlush(account)).thenThrow(new RuntimeException("db error"));

        assertThatThrownBy(() -> service.updateAccount(ACCT_ID, new AccountUpdateRequest(expected, updated)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Update of record failed")
                .satisfies(e -> assertThat(((ConflictException) e).getReason()).isEqualTo("UPDATE_FAILED"));
    }
}
