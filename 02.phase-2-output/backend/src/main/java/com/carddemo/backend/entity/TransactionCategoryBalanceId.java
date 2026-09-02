package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class TransactionCategoryBalanceId implements Serializable {
    @NotNull @Digits(integer = 11, fraction = 0) @Column(name = "TRANCAT_ACCT_ID", precision = 11, scale = 0, nullable = false) private Long accountId;
    @NotNull @Size(max = 2) @Column(name = "TRANCAT_TYPE_CD", length = 2, nullable = false) private String transactionTypeCode;
    @NotNull @Digits(integer = 4, fraction = 0) @Column(name = "TRANCAT_CD", precision = 4, scale = 0, nullable = false) private Integer transactionCategoryCode;

    public TransactionCategoryBalanceId() { }
    public TransactionCategoryBalanceId(Long accountId, String transactionTypeCode, Integer transactionCategoryCode) { this.accountId = accountId; this.transactionTypeCode = transactionTypeCode; this.transactionCategoryCode = transactionCategoryCode; }
    public Long getAccountId() { return accountId; }
    public String getTransactionTypeCode() { return transactionTypeCode; }
    public Integer getTransactionCategoryCode() { return transactionCategoryCode; }
    @Override public boolean equals(Object other) { if (this == other) return true; if (!(other instanceof TransactionCategoryBalanceId that)) return false; return Objects.equals(accountId, that.accountId) && Objects.equals(transactionTypeCode, that.transactionTypeCode) && Objects.equals(transactionCategoryCode, that.transactionCategoryCode); }
    @Override public int hashCode() { return Objects.hash(accountId, transactionTypeCode, transactionCategoryCode); }
}
