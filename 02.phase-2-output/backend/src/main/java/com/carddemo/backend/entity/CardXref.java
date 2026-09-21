package com.carddemo.backend.entity;

import jakarta.persistence.*;

/**
 * ENTITY-004 Card-Account-Customer Cross-Reference (business-entities.md).
 * Mirrors CARD-XREF-RECORD (CVACT03Y.cpy).
 */
@Entity
@Table(name = "card_xref")
public class CardXref {

    @Id
    @Column(name = "xref_card_num", length = 16)
    private String cardNum;

    @Column(name = "xref_cust_id", nullable = false)
    private Long custId;

    @Column(name = "xref_acct_id", nullable = false)
    private Long acctId;

    public String getCardNum() { return cardNum; }
    public void setCardNum(String cardNum) { this.cardNum = cardNum; }
    public Long getCustId() { return custId; }
    public void setCustId(Long custId) { this.custId = custId; }
    public Long getAcctId() { return acctId; }
    public void setAcctId(Long acctId) { this.acctId = acctId; }
}
