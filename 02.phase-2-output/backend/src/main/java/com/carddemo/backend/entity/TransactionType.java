package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "TRANTYPE")
public class TransactionType {
    @Id @NotNull @Size(max = 2) @Column(name = "TRAN_TYPE", length = 2, nullable = false) private String transactionTypeCode;
    @Size(max = 50) @Column(name = "TRAN_TYPE_DESC", length = 50) private String description;
    @OneToMany(mappedBy = "transactionType") private List<TransactionCategory> transactionCategories = new ArrayList<>();
    @OneToMany(mappedBy = "transactionType") private List<CreditCardTransaction> transactions = new ArrayList<>();
    public TransactionType() { }
    public TransactionType(String transactionTypeCode) { this.transactionTypeCode = transactionTypeCode; }
    public String getTransactionTypeCode() { return transactionTypeCode; }
    public void setTransactionTypeCode(String transactionTypeCode) { this.transactionTypeCode = transactionTypeCode; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<TransactionCategory> getTransactionCategories() { return transactionCategories; }
    public List<CreditCardTransaction> getTransactions() { return transactions; }
}
