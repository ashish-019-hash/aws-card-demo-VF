package com.aws.carddemo.repository;

import com.aws.carddemo.entity.CardTransaction;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardTransactionRepository extends JpaRepository<CardTransaction, String> {
    List<CardTransaction> findByCardNumber(String cardNumber);
    java.util.Optional<CardTransaction> findTopByOrderByIdDesc();
}
