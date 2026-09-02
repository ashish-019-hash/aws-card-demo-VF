package com.carddemo.backend.repository;

import com.carddemo.backend.entity.TransactionCategoryBalance;
import com.carddemo.backend.entity.TransactionCategoryBalanceId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionCategoryBalanceRepository extends JpaRepository<TransactionCategoryBalance, TransactionCategoryBalanceId> {
}
