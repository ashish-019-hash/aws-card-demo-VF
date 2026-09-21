package com.carddemo.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * ENTITY-009 Disclosure Group / Interest Rate Table (business-entities.md).
 * Mirrors DIS-GROUP-RECORD (CVTRA02Y.cpy).
 */
@Entity
@Table(name = "disclosure_groups")
public class DisclosureGroup {

    @EmbeddedId
    private DisclosureGroupId id;

    @Column(name = "dis_int_rate", nullable = false, precision = 6, scale = 2)
    private BigDecimal intRate;

    public DisclosureGroupId getId() { return id; }
    public void setId(DisclosureGroupId id) { this.id = id; }
    public BigDecimal getIntRate() { return intRate; }
    public void setIntRate(BigDecimal intRate) { this.intRate = intRate; }
}
