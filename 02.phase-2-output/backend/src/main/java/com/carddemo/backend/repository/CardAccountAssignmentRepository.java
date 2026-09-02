package com.carddemo.backend.repository;

import com.carddemo.backend.entity.CardAccountAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardAccountAssignmentRepository extends JpaRepository<CardAccountAssignment, String> {
    List<CardAccountAssignment> findByAccountAccountId(Long accountId);
}
