package com.carddemo.backend.repository;

import com.carddemo.backend.entity.ApplicationUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationUserRepository extends JpaRepository<ApplicationUser, String> {
    Page<ApplicationUser> findByUserIdStartingWithIgnoreCase(String userId, Pageable pageable);
}
