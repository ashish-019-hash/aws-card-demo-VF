package com.carddemo.backend.repository;

import com.carddemo.backend.entity.TranIdAllocator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface TranIdAllocatorRepository extends JpaRepository<TranIdAllocator, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TranIdAllocator t where t.id = 1")
    Optional<TranIdAllocator> lockRow();
}
