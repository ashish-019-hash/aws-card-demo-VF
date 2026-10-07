package com.aws.carddemo.repository;

import com.aws.carddemo.entity.TransactionCategory;
import com.aws.carddemo.entity.TransactionCategoryId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionCategoryRepository
        extends JpaRepository<TransactionCategory, TransactionCategoryId> { }
