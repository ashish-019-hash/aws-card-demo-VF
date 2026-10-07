package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "transaction_categories")
@Getter
@Setter
@NoArgsConstructor
public class TransactionCategory {
    @EmbeddedId
    private TransactionCategoryId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_type_code", insertable = false, updatable = false)
    private TransactionType transactionType;

    @Size(max = 50)
    @Column(name = "description", length = 50)
    private String description;
}
