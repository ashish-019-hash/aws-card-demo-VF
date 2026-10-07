package com.aws.carddemo.repository;

import com.aws.carddemo.entity.CreditCard;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditCardRepository extends JpaRepository<CreditCard, String> {
    List<CreditCard> findByAccountId(Long accountId);
}
