package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "transaction_category_balances")
@Getter
@Setter
@NoArgsConstructor
public class TransactionCategoryBalance {
    @EmbeddedId
    private TransactionCategoryBalanceId id;

    @Column(name = "balance", precision = 11, scale = 2)
    private BigDecimal balance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", insertable = false, updatable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_type_code", insertable = false, updatable = false)
    private TransactionType transactionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "transaction_type_code", referencedColumnName = "transaction_type_code", insertable = false, updatable = false),
        @JoinColumn(name = "transaction_category_code", referencedColumnName = "transaction_category_code", insertable = false, updatable = false)
    })
    private TransactionCategory transactionCategory;
}
