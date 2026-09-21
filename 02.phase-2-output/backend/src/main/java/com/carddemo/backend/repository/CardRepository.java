package com.carddemo.backend.repository;

import com.carddemo.backend.entity.Card;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Card c where c.cardNum = :cardNum")
    Optional<Card> findByIdForUpdate(@Param("cardNum") String cardNum);

    @Query("select c from Card c where "
            + "(:acctId is null or c.acctId = :acctId) and "
            + "(:cardNum is null or c.cardNum = :cardNum) "
            + "order by c.cardNum")
    Page<Card> search(@Param("acctId") Long acctId, @Param("cardNum") String cardNum, Pageable pageable);
}
