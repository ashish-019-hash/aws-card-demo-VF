package com.carddemo.backend.repository;

import com.carddemo.backend.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, String> {

    /** BR-015: page-size-10 browse, optionally starting at/after a given transaction id. */
    Page<Transaction> findByTranIdGreaterThanEqualOrderByTranIdAsc(String startId, Pageable pageable);

    Page<Transaction> findAllByOrderByTranIdAsc(Pageable pageable);

    Transaction findFirstByCardNumOrderByTranIdDesc(String cardNum);
}
