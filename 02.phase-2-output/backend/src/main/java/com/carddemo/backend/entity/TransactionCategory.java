package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "TRANCATG")
public class TransactionCategory {
    @EmbeddedId private TransactionCategoryId id;
    @MapsId("transactionTypeCode") @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "TRAN_TYPE_CD", nullable = false) private TransactionType transactionType;
    @Size(max = 50) @Column(name = "TRAN_CAT_TYPE_DESC", length = 50) private String description;
    @OneToMany(mappedBy = "transactionCategory") private List<CreditCardTransaction> transactions = new ArrayList<>();
    @OneToMany(mappedBy = "transactionCategory") private List<TransactionCategoryBalance> transactionCategoryBalances = new ArrayList<>();
    @OneToMany(mappedBy = "transactionCategory") private List<DisclosureGroupRate> disclosureGroupRates = new ArrayList<>();
    public TransactionCategory() { }
    public TransactionCategory(TransactionCategoryId id, TransactionType transactionType) { this.id = id; this.transactionType = transactionType; }
    public TransactionCategoryId getId() { return id; }
    public void setId(TransactionCategoryId id) { this.id = id; }
    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<CreditCardTransaction> getTransactions() { return transactions; }
    public List<TransactionCategoryBalance> getTransactionCategoryBalances() { return transactionCategoryBalances; }
    public List<DisclosureGroupRate> getDisclosureGroupRates() { return disclosureGroupRates; }
}
