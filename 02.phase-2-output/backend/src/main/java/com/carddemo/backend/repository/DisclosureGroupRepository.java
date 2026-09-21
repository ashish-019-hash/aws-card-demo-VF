package com.carddemo.backend.repository;

import com.carddemo.backend.entity.DisclosureGroup;
import com.carddemo.backend.entity.DisclosureGroupId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisclosureGroupRepository extends JpaRepository<DisclosureGroup, DisclosureGroupId> {
}
