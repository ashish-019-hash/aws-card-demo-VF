package com.carddemo.backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * ENTITY-005 Transaction (business-entities.md). Mirrors TRAN-RECORD (CVTRA05Y.cpy).
 */
@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @Column(name = "tran_id", length = 16)
    private String tranId;

    @Column(name = "tran_type_cd", length = 2, nullable = false)
    private String typeCd;

    @Column(name = "tran_cat_cd", nullable = false)
    private Integer catCd;

    @Column(name = "tran_source", length = 10, nullable = false)
    private String source;

    @Column(name = "tran_desc", length = 100, nullable = false)
    private String description;

    @Column(name = "tran_amt", nullable = false, precision = 11, scale = 2)
    private BigDecimal amount;

    @Column(name = "tran_merchant_id", nullable = false)
    private Long merchantId;

    @Column(name = "tran_merchant_name", length = 50, nullable = false)
    private String merchantName;

    @Column(name = "tran_merchant_city", length = 50, nullable = false)
    private String merchantCity;

    @Column(name = "tran_merchant_zip", length = 10, nullable = false)
    private String merchantZip;

    @Column(name = "tran_card_num", length = 16, nullable = false)
    private String cardNum;

    /** Persisted format: 26-char {@code YYYY-MM-DD HH:MM:SS.SSSSSS}. */
    @Column(name = "tran_orig_ts", length = 26, nullable = false)
    private String origTs;

    @Column(name = "tran_proc_ts", length = 26)
    private String procTs;

    public String getTranId() { return tranId; }
    public void setTranId(String tranId) { this.tranId = tranId; }
    public String getTypeCd() { return typeCd; }
    public void setTypeCd(String typeCd) { this.typeCd = typeCd; }
    public Integer getCatCd() { return catCd; }
    public void setCatCd(Integer catCd) { this.catCd = catCd; }
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
    public String getCardNum() { return cardNum; }
    public void setCardNum(String cardNum) { this.cardNum = cardNum; }
    public String getOrigTs() { return origTs; }
    public void setOrigTs(String origTs) { this.origTs = origTs; }
    public String getProcTs() { return procTs; }
    public void setProcTs(String procTs) { this.procTs = procTs; }
}
