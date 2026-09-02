package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class DisclosureGroupRateId implements Serializable {
    @NotNull @Size(max = 10) @Column(name = "DIS_ACCT_GROUP_ID", length = 10, nullable = false) private String accountGroupId;
    @NotNull @Size(max = 2) @Column(name = "DIS_TRAN_TYPE_CD", length = 2, nullable = false) private String transactionTypeCode;
    @NotNull @Digits(integer = 4, fraction = 0) @Column(name = "DIS_TRAN_CAT_CD", precision = 4, scale = 0, nullable = false) private Integer transactionCategoryCode;

    public DisclosureGroupRateId() { }
    public DisclosureGroupRateId(String accountGroupId, String transactionTypeCode, Integer transactionCategoryCode) { this.accountGroupId = accountGroupId; this.transactionTypeCode = transactionTypeCode; this.transactionCategoryCode = transactionCategoryCode; }
    public String getAccountGroupId() { return accountGroupId; }
    public String getTransactionTypeCode() { return transactionTypeCode; }
    public Integer getTransactionCategoryCode() { return transactionCategoryCode; }
    @Override public boolean equals(Object other) { if (this == other) return true; if (!(other instanceof DisclosureGroupRateId that)) return false; return Objects.equals(accountGroupId, that.accountGroupId) && Objects.equals(transactionTypeCode, that.transactionTypeCode) && Objects.equals(transactionCategoryCode, that.transactionCategoryCode); }
    @Override public int hashCode() { return Objects.hash(accountGroupId, transactionTypeCode, transactionCategoryCode); }
}
