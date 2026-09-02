package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "TRAN_ID_ALLOCATION")
public class TransactionIdAllocation {
    public static final String ALLOCATION_KEY = "TRANSACTION";

    @Id
    @Column(name = "ALLOCATION_KEY", length = 20, nullable = false)
    private String allocationKey;

    @Column(name = "LAST_ALLOCATED_ID", nullable = false)
    private long lastAllocatedId;

    @Version
    @Column(name = "ALLOCATION_VERSION", nullable = false)
    private Long version;

    public TransactionIdAllocation() { }

    public TransactionIdAllocation(String allocationKey, long lastAllocatedId) {
        this.allocationKey = allocationKey;
        this.lastAllocatedId = lastAllocatedId;
    }

    public String getAllocationKey() { return allocationKey; }
    public long getLastAllocatedId() { return lastAllocatedId; }
    public void setLastAllocatedId(long lastAllocatedId) { this.lastAllocatedId = lastAllocatedId; }
}
