package com.carddemo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** Composite key (TRANCAT-ACCT-ID, TRANCAT-TYPE-CD, TRANCAT-CD) for TransactionCategoryBalance. */
@Embeddable
public class TransactionCategoryBalanceId implements Serializable {

    @Column(name = "trancat_acct_id", nullable = false)
    private Long acctId;
    @Column(name = "trancat_type_cd", length = 2, nullable = false)
    private String typeCd;
    @Column(name = "trancat_cd", nullable = false)
    private Integer catCd;

    public TransactionCategoryBalanceId() { }

    public TransactionCategoryBalanceId(Long acctId, String typeCd, Integer catCd) {
        this.acctId = acctId;
        this.typeCd = typeCd;
        this.catCd = catCd;
    }

    public Long getAcctId() { return acctId; }
    public void setAcctId(Long acctId) { this.acctId = acctId; }
    public String getTypeCd() { return typeCd; }
    public void setTypeCd(String typeCd) { this.typeCd = typeCd; }
    public Integer getCatCd() { return catCd; }
    public void setCatCd(Integer catCd) { this.catCd = catCd; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TransactionCategoryBalanceId that)) return false;
        return Objects.equals(acctId, that.acctId) && Objects.equals(typeCd, that.typeCd)
                && Objects.equals(catCd, that.catCd);
    }

    @Override
    public int hashCode() { return Objects.hash(acctId, typeCd, catCd); }
}
