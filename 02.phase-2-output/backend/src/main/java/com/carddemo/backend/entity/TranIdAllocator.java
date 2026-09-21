package com.carddemo.backend.entity;

import jakarta.persistence.*;

/**
 * Sequence-backed allocation row used to hand out Transaction IDs atomically.
 *
 * <p>BR-010 (business-rules-catalog.md) observes the legacy MAX+1-by-reverse-browse
 * pattern, which is exposed to a race (two concurrent adds can compute the same "next"
 * id). This table is the modernized, concurrency-safe replacement: a single row is
 * locked with {@code SELECT ... FOR UPDATE} (see TransactionIdAllocatorRepository) and
 * its {@code next_tran_id} is atomically read-and-incremented, guaranteeing every
 * caller gets a distinct id without ever surfacing a duplicate-key error to the user.</p>
 */
@Entity
@Table(name = "tran_id_allocator")
public class TranIdAllocator {

    @Id
    private Integer id;

    @Column(name = "next_tran_id", nullable = false)
    private Long nextTranId;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Long getNextTranId() { return nextTranId; }
    public void setNextTranId(Long nextTranId) { this.nextTranId = nextTranId; }
}
