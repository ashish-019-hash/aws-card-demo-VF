package com.aws.carddemo.repository;

import com.aws.carddemo.entity.CardCrossReference;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardCrossReferenceRepository extends JpaRepository<CardCrossReference, String> {
    List<CardCrossReference> findByAccountId(Long accountId);
    List<CardCrossReference> findByCustomerId(Long customerId);
}
