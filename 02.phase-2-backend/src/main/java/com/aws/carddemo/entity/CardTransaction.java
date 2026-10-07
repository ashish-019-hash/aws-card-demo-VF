package com.aws.carddemo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "card_transactions", indexes = {
    @Index(name = "idx_transactions_card", columnList = "card_number"),
    @Index(name = "idx_transactions_processing", columnList = "processing_timestamp")
})
@Getter
@Setter
@NoArgsConstructor
public class CardTransaction {
    @Id
    @Size(max = 16) @Column(name = "transaction_id", length = 16, nullable = false) private String id;
    @Size(max = 2) @Column(name = "transaction_type_code", length = 2, nullable = false) private String transactionTypeCode;
    @Column(name = "transaction_category_code", precision = 4, nullable = false) private Integer transactionCategoryCode;
    @Size(max = 10) @Column(name = "source", length = 10) private String source;
    @Size(max = 100) @Column(name = "description", length = 100) private String description;
    @Column(name = "amount", precision = 11, scale = 2) private BigDecimal amount;
    @Column(name = "merchant_id", precision = 9) private Long merchantId;
    @Size(max = 50) @Column(name = "merchant_name", length = 50) private String merchantName;
    @Size(max = 50) @Column(name = "merchant_city", length = 50) private String merchantCity;
    @Size(max = 10) @Column(name = "merchant_zip", length = 10) private String merchantZip;
    @Size(max = 16) @Column(name = "card_number", length = 16, nullable = false) private String cardNumber;
    @Size(max = 26) @Column(name = "origination_timestamp", length = 26) private String originationTimestamp;
    @Size(max = 26) @Column(name = "processing_timestamp", length = 26) private String processingTimestamp;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_number", insertable = false, updatable = false)
    private CreditCard card;

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
