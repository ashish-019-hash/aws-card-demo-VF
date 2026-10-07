package com.aws.carddemo.service;

import com.aws.carddemo.dto.AccountDto;
import com.aws.carddemo.dto.AccountRequest;
import com.aws.carddemo.entity.Account;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.AccountRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDataService {
    private final AccountRepository repository;
    private final LegacyInputValidator validator;

    public AccountDataService(AccountRepository repository, LegacyInputValidator validator) { this.repository = repository; this.validator = validator; }

    @Transactional(readOnly = true)
    public Page<AccountDto> findAll(Pageable pageable) { return repository.findAll(pageable).map(this::toDto); }

    @Transactional(readOnly = true)
    public AccountDto find(Long id) { validator.accountId(id, true); return toDto(entity(id)); }

    @Transactional
    public AccountDto update(Long id, AccountRequest request) {
        if (!applyUpdate(id, request)) throw new IllegalArgumentException("At least one account field must change");
        return toDto(entity(id));
    }

    /**
     * Validates and applies the update inside the caller's transaction, flushing so the
     * entity carries its post-update version. Returns whether any field changed.
     */
    @Transactional
    public boolean applyUpdate(Long id, AccountRequest request) {
        validator.accountId(id, true);
        validator.account(request);
        Account account = entity(id);
        if (!Objects.equals(account.getVersion(), request.version())) throw new com.aws.carddemo.exception.ResourceConflictException("Account changed after it was fetched");
        boolean changed = !Objects.equals(account.getActiveStatus(), request.activeStatus())
                || !Objects.equals(account.getCurrentBalance(), request.currentBalance())
                || !Objects.equals(account.getCreditLimit(), request.creditLimit())
                || !Objects.equals(account.getCashCreditLimit(), request.cashCreditLimit())
                || !Objects.equals(account.getOpenDate(), request.openDate())
                || !Objects.equals(account.getExpirationDate(), request.expirationDate())
                || !Objects.equals(account.getReissueDate(), request.reissueDate())
                || !Objects.equals(account.getCurrentCycleCredit(), request.currentCycleCredit())
                || !Objects.equals(account.getCurrentCycleDebit(), request.currentCycleDebit())
                || !Objects.equals(account.getAddressZip(), request.addressZip())
                || !Objects.equals(account.getGroupId(), request.groupId());
        if (!changed) return false;
        account.setActiveStatus(request.activeStatus());
        account.setCurrentBalance(request.currentBalance());
        account.setCreditLimit(request.creditLimit());
        account.setCashCreditLimit(request.cashCreditLimit());
        account.setOpenDate(request.openDate());
        account.setExpirationDate(request.expirationDate());
        account.setReissueDate(request.reissueDate());
        account.setCurrentCycleCredit(request.currentCycleCredit());
        account.setCurrentCycleDebit(request.currentCycleDebit());
        account.setAddressZip(request.addressZip());
        account.setGroupId(request.groupId());
        // Flush so the managed entity carries the incremented version for consecutive edits.
        repository.saveAndFlush(account);
        return true;
    }

    private Account entity(Long id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Account", id)); }
    private AccountDto toDto(Account a) { return new AccountDto(a.getId(), a.getVersion(), a.getActiveStatus(), a.getCurrentBalance(), a.getCreditLimit(), a.getCashCreditLimit(), a.getOpenDate(), a.getExpirationDate(), a.getReissueDate(), a.getCurrentCycleCredit(), a.getCurrentCycleDebit(), a.getAddressZip(), a.getGroupId()); }
}
