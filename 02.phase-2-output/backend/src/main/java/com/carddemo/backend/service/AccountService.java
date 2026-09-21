package com.carddemo.backend.service;

import com.carddemo.backend.dto.AccountFields;
import com.carddemo.backend.dto.AccountUpdateRequest;
import com.carddemo.backend.dto.AccountUpdateResponse;
import com.carddemo.backend.dto.AccountView;
import com.carddemo.backend.entity.Account;
import com.carddemo.backend.entity.CardXref;
import com.carddemo.backend.entity.Customer;
import com.carddemo.backend.exception.ConflictException;
import com.carddemo.backend.exception.NotFoundException;
import com.carddemo.backend.repository.AccountRepository;
import com.carddemo.backend.repository.CardXrefRepository;
import com.carddemo.backend.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Account View (COACTVWC) and Account Update (COACTUPC): BR-005/BR-006/BR-007/BR-008.
 *
 * <p><b>BR-005 (preserved as-is):</b> there is no account-ownership check here — any
 * authenticated user (any role) may view or update any account by ID, exactly as the
 * legacy screens allow. This is a documented legacy authorization gap, not fixed here.</p>
 *
 * <p><b>BR-008 modernization note:</b> the legacy program locks and rewrites ACCTDAT then
 * CUSTDAT, with an explicit {@code SYNCPOINT ROLLBACK} only on the second (customer)
 * REWRITE failure (because that is the only point where a prior REWRITE in the same unit
 * of work needs undoing). Spring's {@code @Transactional} gives the same all-or-nothing
 * guarantee automatically for both saves — a failure saving the customer rolls back the
 * account save too — so no manual rollback call is needed here.</p>
 */
@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final CardXrefRepository cardXrefRepository;

    public AccountService(AccountRepository accountRepository, CustomerRepository customerRepository,
                           CardXrefRepository cardXrefRepository) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
        this.cardXrefRepository = cardXrefRepository;
    }

    @Transactional(readOnly = true)
    public AccountView getAccountView(Long acctId) {
        Account account = accountRepository.findById(acctId)
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));
        CardXref xref = cardXrefRepository.findFirstByAcctId(acctId)
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));
        Customer customer = customerRepository.findById(xref.getCustId())
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));
        return toView(account, customer, xref.getCardNum());
    }

    /**
     * BR-006/BR-007/BR-008. Returns {@code changed:false} without writing anything if
     * {@code request.updated()} is field-for-field identical to {@code request.expected()}
     * (BR-006). Otherwise locks both records, re-checks the live values against
     * {@code request.expected()} (BR-007) and throws {@link ConflictException} — with a
     * message that distinguishes a stale-snapshot conflict ("data changed") from a
     * downstream write failure ("update failed") — before applying and saving the change.
     */
    @Transactional
    public AccountUpdateResponse updateAccount(Long acctId, AccountUpdateRequest request) {
        if (AccountFieldsComparator.equal(request.expected(), request.updated())) {
            return new AccountUpdateResponse(false, getAccountView(acctId));
        }

        CardXref xref = cardXrefRepository.findFirstByAcctId(acctId)
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));

        Account account = accountRepository.findByIdForUpdate(acctId)
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));
        Customer customer = customerRepository.findByIdForUpdate(xref.getCustId())
                .orElseThrow(() -> new NotFoundException("Account ID NOT found..."));

        AccountFields live = toFields(account, customer);
        if (!AccountFieldsComparator.equal(live, request.expected())) {
            throw new ConflictException(
                    "DATA_CHANGED: This record has been changed by another user since it was read. "
                            + "Please review the current values and try again.");
        }

        applyFields(account, customer, request.updated());
        try {
            // saveAndFlush (not save): a plain save() only queues the SQL for the
            // transaction's eventual commit-time flush, so a DB-level failure would
            // surface after this try/catch has already exited and never be caught here.
            accountRepository.saveAndFlush(account);
            customerRepository.saveAndFlush(customer);
        } catch (RuntimeException e) {
            throw new ConflictException("UPDATE_FAILED: The update could not be saved. Please try again.");
        }

        return new AccountUpdateResponse(true, toView(account, customer, xref.getCardNum()));
    }

    private void applyFields(Account account, Customer customer, AccountFields f) {
        account.setActiveStatus(f.activeStatus());
        account.setCreditLimit(f.creditLimit());
        account.setCashCreditLimit(f.cashCreditLimit());
        account.setCurrBal(f.currBal());
        account.setCurrCycCredit(f.currCycCredit());
        account.setCurrCycDebit(f.currCycDebit());
        account.setOpenDate(f.openDate());
        account.setExpirationDate(f.expirationDate());
        account.setReissueDate(f.reissueDate());
        account.setGroupId(f.groupId());

        customer.setFirstName(f.firstName());
        customer.setMiddleName(f.middleName());
        customer.setLastName(f.lastName());
        customer.setAddrLine1(f.addrLine1());
        customer.setAddrLine2(f.addrLine2());
        customer.setAddrLine3(f.addrLine3());
        customer.setAddrStateCd(f.addrStateCd());
        customer.setAddrCountryCd(f.addrCountryCd());
        customer.setAddrZip(f.addrZip());
        customer.setPhoneNum1(f.phoneNum1());
        customer.setPhoneNum2(f.phoneNum2());
        customer.setSsn(f.ssn());
        customer.setGovtIssuedId(f.govtIssuedId());
        customer.setDob(f.dob());
        customer.setEftAccountId(f.eftAccountId());
        customer.setPriCardHolderInd(f.priCardHolderInd());
        customer.setFicoCreditScore(f.ficoCreditScore());
    }

    private AccountFields toFields(Account a, Customer c) {
        return new AccountFields(a.getActiveStatus(), a.getCreditLimit(), a.getCashCreditLimit(), a.getCurrBal(),
                a.getCurrCycCredit(), a.getCurrCycDebit(), a.getOpenDate(), a.getExpirationDate(),
                a.getReissueDate(), a.getGroupId(), c.getFirstName(), c.getMiddleName(), c.getLastName(),
                c.getAddrLine1(), c.getAddrLine2(), c.getAddrLine3(), c.getAddrStateCd(), c.getAddrCountryCd(),
                c.getAddrZip(), c.getPhoneNum1(), c.getPhoneNum2(), c.getSsn(), c.getGovtIssuedId(), c.getDob(),
                c.getEftAccountId(), c.getPriCardHolderInd(), c.getFicoCreditScore());
    }

    private AccountView toView(Account a, Customer c, String cardNum) {
        return new AccountView(a.getAcctId(), c.getCustId(), cardNum, toFields(a, c));
    }
}
