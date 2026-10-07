package com.aws.carddemo.repository;

import com.aws.carddemo.entity.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionTypeRepository extends JpaRepository<TransactionType, String> { }
