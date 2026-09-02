package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinColumns;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Entity
@Table(name = "TRANSACT")
public class CreditCardTransaction {
    @Id @NotNull @Size(max = 16) @Column(name = "TRAN_ID", length = 16, nullable = false) private String transactionId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "TRAN_TYPE_CD", nullable = false) private TransactionType transactionType;
    @Digits(integer = 4, fraction = 0) @Column(name = "TRAN_CAT_CD", precision = 4, scale = 0, nullable = false) private Integer transactionCategoryCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumns({@JoinColumn(name = "TRAN_TYPE_CD", referencedColumnName = "TRAN_TYPE_CD", insertable = false, updatable = false), @JoinColumn(name = "TRAN_CAT_CD", referencedColumnName = "TRAN_CAT_CD", insertable = false, updatable = false)})
    private TransactionCategory transactionCategory;
    @Size(max = 10) @Column(name = "TRAN_SOURCE", length = 10) private String source;
    @Size(max = 100) @Column(name = "TRAN_DESC", length = 100) private String description;
    @Digits(integer = 9, fraction = 2) @Column(name = "TRAN_AMT", precision = 11, scale = 2) private BigDecimal amount;
    @Digits(integer = 9, fraction = 0) @Column(name = "TRAN_MERCHANT_ID", precision = 9, scale = 0) private Long merchantId;
    @Size(max = 50) @Column(name = "TRAN_MERCHANT_NAME", length = 50) private String merchantName;
    @Size(max = 50) @Column(name = "TRAN_MERCHANT_CITY", length = 50) private String merchantCity;
    @Size(max = 10) @Column(name = "TRAN_MERCHANT_ZIP", length = 10) private String merchantZip;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "TRAN_CARD_NUM", nullable = false) private Card card;
    @Size(max = 26) @Column(name = "TRAN_ORIG_TS", length = 26) private String originalTimestamp;
    @Size(max = 26) @Column(name = "TRAN_PROC_TS", length = 26) private String processingTimestamp;
    public CreditCardTransaction() { }
    public CreditCardTransaction(String transactionId) { this.transactionId = transactionId; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }
    public Integer getTransactionCategoryCode() { return transactionCategoryCode; }
    public void setTransactionCategoryCode(Integer transactionCategoryCode) { this.transactionCategoryCode = transactionCategoryCode; }
    public TransactionCategory getTransactionCategory() { return transactionCategory; }
    public void setTransactionCategory(TransactionCategory transactionCategory) { this.transactionCategory = transactionCategory; this.transactionCategoryCode = transactionCategory == null ? null : transactionCategory.getId().getTransactionCategoryCode(); }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Long getMerchantId() { return merchantId; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public String getMerchantName() { return merchantName; }
    public void setMerchantName(String merchantName) { this.merchantName = merchantName; }
    public String getMerchantCity() { return merchantCity; }
    public void setMerchantCity(String merchantCity) { this.merchantCity = merchantCity; }
    public String getMerchantZip() { return merchantZip; }
    public void setMerchantZip(String merchantZip) { this.merchantZip = merchantZip; }
    public Card getCard() { return card; }
    public void setCard(Card card) { this.card = card; }
    public String getOriginalTimestamp() { return originalTimestamp; }
    public void setOriginalTimestamp(String originalTimestamp) { this.originalTimestamp = originalTimestamp; }
    public String getProcessingTimestamp() { return processingTimestamp; }
    public void setProcessingTimestamp(String processingTimestamp) { this.processingTimestamp = processingTimestamp; }
}
