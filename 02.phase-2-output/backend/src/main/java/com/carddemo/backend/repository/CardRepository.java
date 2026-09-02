package com.carddemo.backend.repository;

import com.carddemo.backend.entity.Card;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardRepository extends JpaRepository<Card, String> {
    Page<Card> findByAccountAccountId(Long accountId, Pageable pageable);
}
