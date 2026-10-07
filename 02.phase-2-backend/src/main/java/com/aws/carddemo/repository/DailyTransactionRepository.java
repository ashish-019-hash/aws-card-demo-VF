package com.aws.carddemo.repository;

import com.aws.carddemo.entity.DailyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyTransactionRepository extends JpaRepository<DailyTransaction, String> { }
