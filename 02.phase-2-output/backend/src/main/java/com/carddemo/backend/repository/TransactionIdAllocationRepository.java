package com.carddemo.backend.repository;

import com.carddemo.backend.entity.TransactionIdAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface TransactionIdAllocationRepository extends JpaRepository<TransactionIdAllocation, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select allocation from TransactionIdAllocation allocation where allocation.allocationKey = :allocationKey")
    Optional<TransactionIdAllocation> findLockedByAllocationKey(@Param("allocationKey") String allocationKey);
}
