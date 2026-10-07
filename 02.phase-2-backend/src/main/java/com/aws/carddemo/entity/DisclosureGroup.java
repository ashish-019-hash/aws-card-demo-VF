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
@Table(name = "disclosure_groups")
@Getter
@Setter
@NoArgsConstructor
public class DisclosureGroup {
    @EmbeddedId
    private DisclosureGroupId id;

    @Column(name = "interest_rate", precision = 6, scale = 2)
    private BigDecimal interestRate;

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
