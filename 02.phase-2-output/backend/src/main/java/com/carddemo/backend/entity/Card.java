package com.carddemo.backend.entity;

import jakarta.persistence.*;

/**
 * ENTITY-003 Card (business-entities.md). Mirrors CARD-RECORD (CVACT02Y.cpy).
 */
@Entity
@Table(name = "cards")
public class Card {

    @Id
    @Column(name = "card_num", length = 16)
    private String cardNum;

    @Column(name = "card_acct_id", nullable = false)
    private Long acctId;

    @Column(name = "card_cvv_cd", nullable = false)
    private Integer cvvCd;

    @Column(name = "card_embossed_name", length = 50, nullable = false)
    private String embossedName;

    /** Note: field name preserves the legacy misspelling "CARD-EXPIRAION-DATE". */
    @Column(name = "card_expiraion_date", length = 10, nullable = false)
    private String expirationDate;

    @Column(name = "card_active_status", length = 1, nullable = false)
    private String activeStatus;

    public String getCardNum() { return cardNum; }
    public void setCardNum(String cardNum) { this.cardNum = cardNum; }
    public Long getAcctId() { return acctId; }
    public void setAcctId(Long acctId) { this.acctId = acctId; }
    public Integer getCvvCd() { return cvvCd; }
    public void setCvvCd(Integer cvvCd) { this.cvvCd = cvvCd; }
    public String getEmbossedName() { return embossedName; }
    public void setEmbossedName(String embossedName) { this.embossedName = embossedName; }
    public String getExpirationDate() { return expirationDate; }
    public void setExpirationDate(String expirationDate) { this.expirationDate = expirationDate; }
    public String getActiveStatus() { return activeStatus; }
    public void setActiveStatus(String activeStatus) { this.activeStatus = activeStatus; }
}
