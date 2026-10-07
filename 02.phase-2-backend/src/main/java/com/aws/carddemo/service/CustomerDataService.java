package com.aws.carddemo.service;

import com.aws.carddemo.dto.CustomerDto;
import com.aws.carddemo.dto.CustomerRequest;
import com.aws.carddemo.entity.Customer;
import com.aws.carddemo.exception.ResourceNotFoundException;
import com.aws.carddemo.repository.CustomerRepository;
import com.aws.carddemo.validation.LegacyInputValidator;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerDataService {
    private final CustomerRepository repository;
    private final LegacyInputValidator validator;
    public CustomerDataService(CustomerRepository repository, LegacyInputValidator validator) { this.repository = repository; this.validator = validator; }

    @Transactional(readOnly = true) public Page<CustomerDto> findAll(Pageable pageable) { return repository.findAll(pageable).map(this::toDto); }
    @Transactional(readOnly = true) public CustomerDto find(Long id) { return toDto(entity(id)); }

    @Transactional
    public CustomerDto update(Long id, CustomerRequest r) {
        if (!applyUpdate(id, r)) throw new IllegalArgumentException("At least one customer field must change");
        return toDto(entity(id));
    }

    /**
     * Validates and applies the update inside the caller's transaction, flushing so the
     * entity carries its post-update version. Returns whether any field changed.
     */
    @Transactional
    public boolean applyUpdate(Long id, CustomerRequest r) {
        validator.customer(r);
        Customer c = entity(id);
        if (!Objects.equals(c.getVersion(), r.version())) throw new com.aws.carddemo.exception.ResourceConflictException("Customer changed after it was fetched");
        boolean changed = !Objects.equals(c.getFirstName(), r.firstName()) || !Objects.equals(c.getMiddleName(), r.middleName())
                || !Objects.equals(c.getLastName(), r.lastName()) || !Objects.equals(c.getAddressLine1(), r.addressLine1())
                || !Objects.equals(c.getAddressLine2(), r.addressLine2()) || !Objects.equals(c.getAddressLine3(), r.addressLine3())
                || !Objects.equals(c.getAddressStateCode(), r.addressStateCode()) || !Objects.equals(c.getAddressCountryCode(), r.addressCountryCode())
                || !Objects.equals(c.getAddressZip(), r.addressZip()) || !Objects.equals(c.getPhoneNumber1(), r.phoneNumber1())
                || !Objects.equals(c.getPhoneNumber2(), r.phoneNumber2()) || !Objects.equals(c.getSsn(), Long.valueOf(r.ssn()))
                || !Objects.equals(c.getGovernmentIssuedId(), r.governmentIssuedId()) || !Objects.equals(c.getDateOfBirth(), r.dateOfBirth())
                || !Objects.equals(c.getEftAccountId(), r.eftAccountId()) || !Objects.equals(c.getPrimaryCardholderIndicator(), r.primaryCardholderIndicator())
                || !Objects.equals(c.getFicoCreditScore(), r.ficoCreditScore());
        if (!changed) return false;
        c.setFirstName(r.firstName()); c.setMiddleName(r.middleName()); c.setLastName(r.lastName());
        c.setAddressLine1(r.addressLine1()); c.setAddressLine2(r.addressLine2()); c.setAddressLine3(r.addressLine3());
        c.setAddressStateCode(r.addressStateCode()); c.setAddressCountryCode(r.addressCountryCode()); c.setAddressZip(r.addressZip());
        c.setPhoneNumber1(r.phoneNumber1()); c.setPhoneNumber2(r.phoneNumber2()); c.setSsn(Long.valueOf(r.ssn()));
        c.setGovernmentIssuedId(r.governmentIssuedId()); c.setDateOfBirth(r.dateOfBirth()); c.setEftAccountId(r.eftAccountId());
        c.setPrimaryCardholderIndicator(r.primaryCardholderIndicator()); c.setFicoCreditScore(r.ficoCreditScore());
        // Flush so the managed entity carries the incremented version for consecutive edits.
        repository.saveAndFlush(c);
        return true;
    }

    private Customer entity(Long id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer", id)); }
    private CustomerDto toDto(Customer c) { return new CustomerDto(c.getId(), c.getVersion(), c.getFirstName(), c.getMiddleName(), c.getLastName(), c.getAddressLine1(), c.getAddressLine2(), c.getAddressLine3(), c.getAddressStateCode(), c.getAddressCountryCode(), c.getAddressZip(), c.getPhoneNumber1(), c.getPhoneNumber2(), c.getSsn(), c.getGovernmentIssuedId(), c.getDateOfBirth(), c.getEftAccountId(), c.getPrimaryCardholderIndicator(), c.getFicoCreditScore()); }
}
