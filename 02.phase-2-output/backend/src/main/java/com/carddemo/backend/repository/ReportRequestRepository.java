package com.carddemo.backend.repository;

import com.carddemo.backend.entity.ReportRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRequestRepository extends JpaRepository<ReportRequest, Long> {
}
