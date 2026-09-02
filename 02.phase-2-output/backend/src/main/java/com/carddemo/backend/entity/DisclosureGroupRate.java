package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

@Entity
@Table(name = "DISCGRP")
public class DisclosureGroupRate {
    @EmbeddedId private DisclosureGroupRateId id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({@JoinColumn(name = "DIS_TRAN_TYPE_CD", referencedColumnName = "TRAN_TYPE_CD", insertable = false, updatable = false), @JoinColumn(name = "DIS_TRAN_CAT_CD", referencedColumnName = "TRAN_CAT_CD", insertable = false, updatable = false)})
    private TransactionCategory transactionCategory;
    @Digits(integer = 4, fraction = 2) @Column(name = "DIS_INT_RATE", precision = 6, scale = 2) private BigDecimal interestRate;
    public DisclosureGroupRate() { }
    public DisclosureGroupRate(DisclosureGroupRateId id, TransactionCategory transactionCategory) { this.id = id; this.transactionCategory = transactionCategory; }
    public DisclosureGroupRateId getId() { return id; }
    public void setId(DisclosureGroupRateId id) { this.id = id; }
    public TransactionCategory getTransactionCategory() { return transactionCategory; }
    public void setTransactionCategory(TransactionCategory transactionCategory) { this.transactionCategory = transactionCategory; }
    public BigDecimal getInterestRate() { return interestRate; }
    public void setInterestRate(BigDecimal interestRate) { this.interestRate = interestRate; }
}
