package com.carddemo.backend.repository;

import com.carddemo.backend.entity.CreditCardTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CreditCardTransactionRepository extends JpaRepository<CreditCardTransaction, String> {
    Page<CreditCardTransaction> findByTransactionIdGreaterThanEqual(String transactionId, Pageable pageable);
    Optional<CreditCardTransaction> findTopByOrderByTransactionIdDesc();
    /** Report selection is inclusive and uses the legacy processing timestamp's leading YYYY-MM-DD bytes. */
    @Query("""
            select t from CreditCardTransaction t
            where substring(t.processingTimestamp, 1, 10) between :start and :end
            order by t.card.cardNumber, t.transactionId
            """)
    List<CreditCardTransaction> findForReportPeriod(String start, String end);
}
