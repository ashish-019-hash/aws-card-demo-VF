package com.carddemo.backend.repository;

import com.carddemo.backend.entity.TransactionCategory;
import com.carddemo.backend.entity.TransactionCategoryId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionCategoryRepository extends JpaRepository<TransactionCategory, TransactionCategoryId> {
}
