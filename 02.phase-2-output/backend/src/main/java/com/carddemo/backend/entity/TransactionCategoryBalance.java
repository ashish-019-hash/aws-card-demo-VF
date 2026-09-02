package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

@Entity
@Table(name = "TCATBALF")
public class TransactionCategoryBalance {
    @EmbeddedId private TransactionCategoryBalanceId id;
    @MapsId("accountId") @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "TRANCAT_ACCT_ID", nullable = false) private Account account;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({@JoinColumn(name = "TRANCAT_TYPE_CD", referencedColumnName = "TRAN_TYPE_CD", insertable = false, updatable = false), @JoinColumn(name = "TRANCAT_CD", referencedColumnName = "TRAN_CAT_CD", insertable = false, updatable = false)})
    private TransactionCategory transactionCategory;
    @Digits(integer = 9, fraction = 2) @Column(name = "TRAN_CAT_BAL", precision = 11, scale = 2) private BigDecimal balance;
    public TransactionCategoryBalance() { }
    public TransactionCategoryBalance(TransactionCategoryBalanceId id, Account account, TransactionCategory transactionCategory) { this.id = id; this.account = account; this.transactionCategory = transactionCategory; }
    public TransactionCategoryBalanceId getId() { return id; }
    public void setId(TransactionCategoryBalanceId id) { this.id = id; }
    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }
    public TransactionCategory getTransactionCategory() { return transactionCategory; }
    public void setTransactionCategory(TransactionCategory transactionCategory) { this.transactionCategory = transactionCategory; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}
