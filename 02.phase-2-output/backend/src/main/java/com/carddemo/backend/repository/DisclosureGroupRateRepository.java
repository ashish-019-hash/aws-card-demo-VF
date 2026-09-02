package com.carddemo.backend.repository;

import com.carddemo.backend.entity.DisclosureGroupRate;
import com.carddemo.backend.entity.DisclosureGroupRateId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisclosureGroupRateRepository extends JpaRepository<DisclosureGroupRate, DisclosureGroupRateId> {
}
